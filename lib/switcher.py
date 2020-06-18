# Reverse Engineering and coding by Aviad Golan @AviadGolan and Shai Rod @NightRang3r

#!/usr/bin/env python

import binascii as ba
import time
import struct
import socket
import sys
import os
import re
import signal

switcherIP = sys.argv[2]
phone_id = "0000"  
device_id = sys.argv[3]
device_pass = "00000000"


UDP_IP = "0.0.0.0"
UDP_PORT = 20002

if  sys.argv[1] == "discover":
	sCommand = "3"
elif sys.argv[1] == "setOff":
	sCommand = "0"
elif sys.argv[1] == "setOn":
	sCommand = "1"
elif sys.argv[1] == "getState":
	sCommand = "2"
elif sys.argv[1].startswith('t'):
	sCommand = "1"
elif sys.argv[1].startswith('m'):
	sCommand = "2"

# CRC 
def crcSignFullPacketComKey(pData, pKey):
	crc = ba.hexlify(struct.pack('>I', ba.crc_hqx(ba.unhexlify(pData), 0x1021)))
	pData = bytes(pData, "utf-8") + crc[6:8] + crc[4:6]
	crc = crc[6:8] + crc[4:6] + ba.hexlify( bytes(pKey, "utf-8") )
	crc = bytes(ba.hexlify(struct.pack('>I', ba.crc_hqx(ba.unhexlify(crc), 0x1021))))
	pData = pData + crc[6:8] + crc[4:6]
	return pData

# Generate Time Stamp
def getTS():
	return ba.hexlify(struct.pack('<I', int(round(time.time())))).decode("utf-8")

# Generate Timer value
def sTimer(sMinutes):
    sSeconds = int(sMinutes) * 60
    sDelay = struct.pack('<I', sSeconds)
    return ba.hexlify(sDelay)

# Get Power consumption and Elctrical current
def getPower(res):
	b = ba.hexlify(res)[154:162]
	i = int(b[2:4]+b[0:2], 16)
	return "\"electricCurrentAmper\": %.1f" % (i/float(220)) + ", \"powerConsumptionWatts\": " + str(i) + ", "

# Auto shutdown countdown
def sTime(res):
	b = ba.hexlify(res)[178:186]
	open_time = int(b[6:8] + b[4:6] + b[2:4] + b[0:2] , 16)
	m, s = divmod(open_time, 60)
	h, m = divmod(m, 60)
	return "\"timeLeftMs\": " + str(h*3600000 + m*60000 + s*1000)

#  Generate auto shutdown time 
def setAutoClose(hours):
	h, m = hours.split(':')
	mSeconds = int(h) * 3600 + int(m) * 60 
	if mSeconds < 3600:
		print("{ \"status\": \"failed\", \"message\": \"Value Can't be less than 1 hour!\" }")
		sys.exit()
	elif mSeconds > 86340:
		print("{ \"status\": \"failed\", \"message\": \"Value can't be more than 23 hours and 59 minutes!\" }")
		sys.exit()
	else:
		print ("{ \"message\": \"Auto shutdown was set to " + str(hours*3600000) + " Hour(s)\"}")
		return ba.hexlify(struct.pack('<I', mSeconds))

def getAutoClose(res):
	b = ba.hexlify(res)[194:202]
	open_time = int(b[6:8] + b[4:6] + b[2:4] + b[0:2] , 16)
	m, s = divmod(open_time, 60)
	h, m = divmod(m, 60)
	return "\"autoShutdownMs\": " + str(h*3600000 + m*60000)  + ", "
	
hourRe = re.compile(r'^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$')

def sigint_handler(signum, frame):
	print("{ \"status\": \"failed\", \"message\": \"Stopped!\" }")
	sys.exit(0)

 
signal.signal(signal.SIGINT, sigint_handler)

############# DO NOT CHANGE ############
pSession = "00000000"
pKey = "00000000000000000000000000000000"
############# DO NOT CHANGE ############


if sys.argv[1] == "discover":
	sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM) 
	sock.bind((UDP_IP, UDP_PORT))
	while True:
		data, addr = sock.recvfrom(1024) 
		if ba.hexlify(data)[0:4] != "fef0" and len(data) != 165:
			print("{ \"status\": \"failed\", \"message\": \"Not a switcher broadcast message!\" }")
		else:
			b = ba.hexlify(data)[152:160]
			ip_addr = int(b[6:8] + b[4:6] + b[2:4] + b[0:2] , 16)
			device_id = ba.hexlify(data)[36:42].decode("utf-8")
			switcherIP = socket.inet_ntoa(struct.pack("<L", ip_addr))
			print("{ \"status\": \"success\", \"deviceID\": \"" + device_id + "\", \"deviceIP\": \"" + str(switcherIP) + "\" }")
			break

else:
	try:
		time.sleep(3)
		s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
		s.connect((switcherIP, 9957)) 
		data = "fef052000232a100" + pSession + "340001000000000000000000"  + getTS() + "00000000000000000000f0fe1c00" + phone_id + "0000" + device_pass + "00000000000000000000000000000000000000000000000000000000"
		ata = crcSignFullPacketComKey(data, pKey)
		s.send(ba.unhexlify(data))
		res = s.recv(1024)
		pSession2 = ba.hexlify(res)[16:24].decode("utf-8")
		if not pSession2:
			s.close()
			print("{ \"status\": \"failed\", \"message\": \"Operation failed, Could not acquire SessionID, Please try again...\" }")
			sys.exit()

		data = "fef0300002320103" + pSession2 + "340001000000000000000000" + getTS() + "00000000000000000000f0fe" + device_id + "00"
		data = crcSignFullPacketComKey(data, pKey)
		s.send(ba.unhexlify(data))
		res = s.recv(1024)
		deviceName = res[40:72].decode("utf-8")
		state = ba.hexlify(res)[150:154].decode("utf-8")
		if sys.argv[1] == "setOff" and state == "0000":
			s.close()
			print ("{ \"status\": \"success\", \"message\": \"Device is already OFF\" }")
			sys.exit()
		elif sys.argv[1] == "setOn" and state == "0100":
			s.close()
			print ("{ \"status\": \"success\", \"message\": \"Device is already ON\" }")
			sys.exit()
		elif sys.argv[1] == "getState" and state == "0100":
			s.close()
			print ("{ \"status\": \"success\", \"power\": \"on\", " + getPower(res) + getAutoClose(res) + sTime(res) + " }")
			sys.exit()
		elif sys.argv[1] == "getState" and state == "0000":
			s.close()
			print ("{ \"status\": \"success\", \"power\": \"off\", " + getPower(res) + getAutoClose(res) + sTime(res) + " }")
			sys.exit()
		elif sys.argv[1].startswith('t'):
			try:
				sMinutes = int(sys.argv[1][1:])
			except:
				print("{ \"status\": \"failed\", \"message\": \"" + sys.argv[1][1:] + " Is not a valid number!\" }")
				sys.exit()
			if sMinutes > 0 and sMinutes <=60:
				data = "fef05d0002320102" + pSession2 + "340001000000000000000000" + getTS() + "00000000000000000000f0fe" + device_id + "00" + phone_id + "0000" + device_pass + "000000000000000000000000000000000000000000000000000000000106000100"  + sTimer(sMinutes)
				data = crcSignFullPacketComKey(data, pKey)
				s.send(ba.unhexlify(data))
				res = s.recv(1024)
				print("{ \"status\": \"success\", \"message\": \"Turning Switcher ON for " + str(sMinutes) + " minutes...\" }")
				s.close()
			else:
				print("{ \"status\": \"failed\", \"message\": \"Enter a value between 1-60 minutes\" }")
				sys.exit()
		elif sys.argv[1].startswith('m'):
			if not hourRe.match(sys.argv[1][1:]):
				print("{ \"status\": \"failed\", \"message\": \"Please enter a value between 01:00 - 23:59\" }")
				sys.exit()
		
			else:
				auto_close = setAutoClose(sys.argv[1][1:])
				data ="fef05b0002320102" + pSession2 + "340001000000000000000000" + getTS() + "00000000000000000000f0fe" + device_id + "00" + phone_id + "0000" + device_pass + "00000000000000000000000000000000000000000000000000000000040400" + auto_close
				data = crcSignFullPacketComKey(data, pKey)
				s.send(ba.unhexlify(data))
				res = s.recv(1024)
				print ("{ \"message\": \"Sending AutoClose Command to Switcher\", ")
				s.close()
		else:
			data = "fef05d0002320102" + pSession2 + "340001000000000000000000" + getTS() + "00000000000000000000f0fe" + device_id + "00" + phone_id + "0000" + device_pass + "000000000000000000000000000000000000000000000000000000000106000" + sCommand + "0000000000"
			data = crcSignFullPacketComKey(data, pKey)
			s.send(ba.unhexlify(data))
			res = s.recv(1024)
			
			if sCommand == "0":
				print ("{ \"message\": \"Sending OFF Command to Switcher\", ")
			elif sCommand == "1":
				print ("{ \"message\": \"Sending ON Command to Switcher\", ")

			s.close()
		print("\"status\": \"success\" }")

	except Exception as e:
		print("{ \"status\": \"failed\", \"message\": \"" + str(e).replace('"', '\\"') + "\" }")
