import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, TerminalSquare, Sparkles, Layers3, ChevronRight, PanelLeftClose, PanelLeftOpen, Maximize2, Minimize2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const KALI_CATEGORIES = [
  { name: 'Information Gathering', count: 29 },
  { name: 'Vulnerability Analysis', count: 11 },
  { name: 'Web Application', count: 18 },
  { name: 'Password Attacks', count: 9 },
  { name: 'Wireless Attacks', count: 6 },
  { name: 'Sniffing & Spoofing', count: 11 },
  { name: 'Exploitation', count: 8 },
  { name: 'Post Exploitation', count: 12 },
  { name: 'Forensics', count: 8 },
  { name: 'Reporting', count: 2 },
  { name: 'Reverse Engineering', count: 10 },
  { name: 'Social Engineering', count: 7 },
  { name: 'Maintaining Access', count: 8 },
  { name: 'Stress Testing', count: 5 },
  { name: 'Hardware Hacking', count: 5 },
];

const makeExamples = (examples) =>
  examples.map(([command, comment]) => ({ command, comment }));

const KALI_TOOL_INDEX = [
  {
    name: 'Nmap',
    category: 'Information Gathering',
    description: 'Network discovery and service enumeration',
    examples: makeExamples([
      ['nmap -sn 192.168.1.0/24', 'Ping sweep for live hosts on a subnet'],
      ['nmap -sV 10.10.10.10', 'Detect versions on open services'],
      ['nmap -A target.com', 'Run aggressive scan with scripts and OS hints'],
      ['nmap -p- 10.10.10.10', 'Scan all TCP ports'],
      ['nmap --script vuln 10.10.10.10', 'Run NSE vulnerability scripts'],
    ]),
  },
  {
    name: 'Whois',
    category: 'Information Gathering',
    description: 'Domain registration intelligence',
    examples: makeExamples([
      ['whois example.com', 'Get registrar and owner records'],
      ['whois 8.8.8.8', 'Query IP ownership details'],
      ['whois -h whois.arin.net 8.8.8.8', 'Ask a specific whois server'],
      ['whois github.com | grep Expiry', 'Check expiration fields quickly'],
      ['whois example.org | less', 'Review full domain registration output'],
    ]),
  },
  {
    name: 'DNSenum',
    category: 'Information Gathering',
    description: 'DNS and host enumeration',
    examples: makeExamples([
      ['dnsenum example.com', 'Enumerate records and common subdomains'],
      ['dnsenum --threads 10 example.com', 'Increase enumeration speed'],
      ['dnsenum --enum example.com', 'Run full DNS enum routine'],
      ['dnsenum --noreverse example.com', 'Skip reverse lookup stage'],
      ['dnsenum --dnsserver 8.8.8.8 example.com', 'Query using a custom resolver'],
    ]),
  },
  {
    name: 'Enum4linux',
    category: 'Information Gathering',
    description: 'SMB and Windows enumeration',
    examples: makeExamples([
      ['enum4linux -a 192.168.1.10', 'Run all enum modules'],
      ['enum4linux -U 192.168.1.10', 'Enumerate SMB users'],
      ['enum4linux -S 192.168.1.10', 'List SMB shares'],
      ['enum4linux -P 192.168.1.10', 'Check password policy'],
      ['enum4linux -o 192.168.1.10', 'Gather OS information'],
    ]),
  },
  {
    name: 'SMBClient',
    category: 'Information Gathering',
    description: 'SMB share interaction',
    examples: makeExamples([
      ['smbclient -L //192.168.1.10 -N', 'List shares anonymously'],
      ['smbclient //192.168.1.10/public -N', 'Open a share without creds'],
      ['smbclient //192.168.1.10/share -U admin', 'Access share with username'],
      ['smbclient //192.168.1.10/share -c "ls"', 'Run a share command directly'],
      ['smbclient //192.168.1.10/share -c "get backup.zip"', 'Download a file from SMB'],
    ]),
  },
  {
    name: 'theHarvester',
    category: 'Information Gathering',
    description: 'Emails, hosts, and OSINT collection',
    examples: makeExamples([
      ['theHarvester -d example.com -b all', 'Gather from all supported engines'],
      ['theHarvester -d example.com -b bing', 'Query Bing only'],
      ['theHarvester -d example.com -b linkedin', 'Collect employee references'],
      ['theHarvester -d example.com -l 200 -b google', 'Increase result limit'],
      ['theHarvester -d example.com -f report.html', 'Write findings to a report'],
    ]),
  },
  {
    name: 'WhatWeb',
    category: 'Information Gathering',
    description: 'Website fingerprinting',
    examples: makeExamples([
      ['whatweb https://example.com', 'Fingerprint a single site'],
      ['whatweb --color=never https://example.com', 'Plain output for scripts'],
      ['whatweb -a 3 https://example.com', 'Use more aggressive detection'],
      ['whatweb -v https://example.com', 'Show verbose plugin matches'],
      ['whatweb https://example.com/login', 'Fingerprint a specific path'],
    ]),
  },
  {
    name: 'Recon-ng',
    category: 'Information Gathering',
    description: 'Modular reconnaissance framework',
    examples: makeExamples([
      ['recon-ng', 'Start the framework console'],
      ['marketplace search whois', 'Search for a whois module inside recon-ng'],
      ['marketplace install recon/domains-hosts/bing_domain_web', 'Install a module'],
      ['modules load recon/domains-hosts/bing_domain_web', 'Load a recon module'],
      ['options set SOURCE example.com', 'Set target domain for the module'],
    ]),
  },
  {
    name: 'Amass',
    category: 'Information Gathering',
    description: 'Attack surface and subdomain mapping',
    examples: makeExamples([
      ['amass enum -d example.com', 'Basic subdomain enumeration'],
      ['amass intel -d example.com', 'Gather infrastructure intel'],
      ['amass enum -active -d example.com', 'Use active probing'],
      ['amass enum -brute -d example.com', 'Run brute-force subdomain discovery'],
      ['amass viz -dir amass_output', 'Visualize collected graph data'],
    ]),
  },
  {
    name: 'Subfinder',
    category: 'Information Gathering',
    description: 'Passive subdomain discovery',
    examples: makeExamples([
      ['subfinder -d example.com', 'Run passive discovery for one domain'],
      ['subfinder -dL domains.txt', 'Enumerate many domains from a list'],
      ['subfinder -d example.com -silent', 'Only print subdomains'],
      ['subfinder -d example.com -all', 'Use all passive sources'],
      ['subfinder -d example.com -o subs.txt', 'Save results to a file'],
    ]),
  },
  {
    name: 'httpx',
    category: 'Information Gathering',
    description: 'HTTP probing and tech checks',
    examples: makeExamples([
      ['httpx -u https://example.com', 'Probe a single target'],
      ['httpx -l hosts.txt', 'Probe a list of hosts'],
      ['httpx -l hosts.txt -sc -title', 'Show status code and title'],
      ['httpx -l hosts.txt -tech-detect', 'Fingerprint web technologies'],
      ['httpx -l hosts.txt -follow-redirects', 'Follow redirect chains'],
    ]),
  },
  {
    name: 'Fierce',
    category: 'Information Gathering',
    description: 'DNS recon and zone probing',
    examples: makeExamples([
      ['fierce --domain example.com', 'Basic DNS recon'],
      ['fierce --domain example.com --subdomains www,mail,dev', 'Check selected names'],
      ['fierce --domain example.com --wide', 'Wider brute-force search'],
      ['fierce --domain example.com --dns-servers 8.8.8.8', 'Use a custom DNS server'],
      ['fierce --domain example.com --delay 2', 'Slow requests to reduce noise'],
    ]),
  },
  {
    name: 'DNSRecon',
    category: 'Information Gathering',
    description: 'DNS enumeration toolkit',
    examples: makeExamples([
      ['dnsrecon -d example.com', 'Collect standard DNS records'],
      ['dnsrecon -d example.com -t brt', 'Brute-force subdomains'],
      ['dnsrecon -d example.com -t axfr', 'Test zone transfer'],
      ['dnsrecon -d example.com -t std --xml dns.xml', 'Export XML report'],
      ['dnsrecon -d example.com -n 1.1.1.1', 'Query a specific nameserver'],
    ]),
  },
  {
    name: 'Masscan',
    category: 'Information Gathering',
    description: 'Fast Internet-scale port scanning',
    examples: makeExamples([
      ['masscan 10.10.10.0/24 -p80,443', 'Fast scan of common web ports'],
      ['masscan 10.10.10.10 -p1-65535 --rate 1000', 'Full TCP range scan'],
      ['masscan 192.168.1.0/24 -p22 --rate 500', 'Look for SSH at a safe rate'],
      ['masscan -iL targets.txt -p3389', 'Scan targets from a file'],
      ['masscan 10.0.0.0/8 -p445 --exclude 10.0.0.5', 'Scan broad ranges with exclusions'],
    ]),
  },
  {
    name: 'RustScan',
    category: 'Information Gathering',
    description: 'Fast port scanning with Nmap handoff',
    examples: makeExamples([
      ['rustscan -a 10.10.10.10', 'Fast default port discovery'],
      ['rustscan -a 10.10.10.10 -- -sV', 'Hand off results to Nmap version scan'],
      ['rustscan -a 10.10.10.10 -r 1-65535', 'Scan the full port range'],
      ['rustscan -a 10.10.10.10 -b 500', 'Tune batch size'],
      ['rustscan -a 10.10.10.10 --ulimit 5000', 'Raise file descriptor limit for speed'],
    ]),
  },
  {
    name: 'DMitry',
    category: 'Information Gathering',
    description: 'Basic domain and host intel',
    examples: makeExamples([
      ['dmitry example.com', 'Run a simple info collection'],
      ['dmitry -winse example.com', 'Collect whois, netcraft, and emails'],
      ['dmitry -p example.com', 'Check TCP ports'],
      ['dmitry -s example.com', 'Search for subdomains'],
      ['dmitry -o dmitry.txt example.com', 'Save report output'],
    ]),
  },
  {
    name: 'Shodan CLI',
    category: 'Information Gathering',
    description: 'Search exposed Internet assets',
    examples: makeExamples([
      ['shodan init YOUR_API_KEY', 'Configure Shodan CLI access'],
      ['shodan host 8.8.8.8', 'Inspect a specific host'],
      ['shodan search apache country:US', 'Search indexed exposed services'],
      ['shodan stats --facets port apache', 'View top ports for a query'],
      ['shodan download web_targets "http.title:\\"login\\""', 'Export a result set'],
    ]),
  },
  {
    name: 'SpiderFoot',
    category: 'Information Gathering',
    description: 'Automated OSINT collection',
    examples: makeExamples([
      ['spiderfoot -l 127.0.0.1:5001', 'Launch SpiderFoot web UI'],
      ['spiderfoot -s example.com', 'Start a scan from CLI'],
      ['spiderfoot -s 8.8.8.8 -m sfp_dnsresolve', 'Run a selected module'],
      ['spiderfoot -u admin -p admin', 'Set UI credentials on startup'],
      ['spiderfoot -q', 'Run in quiet mode'],
    ]),
  },
  {
    name: 'SMBMap',
    category: 'Information Gathering',
    description: 'SMB enumeration and share mapping',
    examples: makeExamples([
      ['smbmap -H 192.168.1.10', 'List shares anonymously or with guest access'],
      ['smbmap -H 192.168.1.10 -u admin -p Password123', 'Auth and enumerate shares'],
      ['smbmap -H 192.168.1.10 -r share', 'Recursively list a share'],
      ['smbmap -H 192.168.1.10 --download share\\\\file.txt', 'Download a remote file'],
      ['smbmap -H 192.168.1.10 -x "ipconfig"', 'Execute a command if access allows'],
    ]),
  },
  {
    name: 'snmpwalk',
    category: 'Information Gathering',
    description: 'SNMP data collection',
    examples: makeExamples([
      ['snmpwalk -v2c -c public 192.168.1.1', 'Walk full SNMP tree'],
      ['snmpwalk -v2c -c public 192.168.1.1 system', 'Query system branch only'],
      ['snmpwalk -v1 -c public 192.168.1.1', 'Use SNMP v1'],
      ['snmpwalk -v3 -u admin -l authNoPriv 192.168.1.1', 'Query SNMP v3 target'],
      ['snmpwalk -On -v2c -c public 192.168.1.1', 'Print numeric OIDs'],
    ]),
  },
  {
    name: 'nbtscan',
    category: 'Information Gathering',
    description: 'NetBIOS name scanning',
    examples: makeExamples([
      ['nbtscan 192.168.1.0/24', 'Scan subnet for NetBIOS names'],
      ['nbtscan -r 192.168.1.0/24', 'Retry hosts with no reply'],
      ['nbtscan -v 192.168.1.50', 'Verbose scan of a single host'],
      ['nbtscan -f hosts.txt 192.168.1.0/24', 'Save output to a file'],
      ['nbtscan -s : 192.168.1.0/24', 'Use custom output separator'],
    ]),
  },
  {
    name: 'ldapsearch',
    category: 'Information Gathering',
    description: 'LDAP directory queries',
    examples: makeExamples([
      ['ldapsearch -x -H ldap://192.168.1.20 -b dc=corp,dc=local', 'Anonymous base search'],
      ['ldapsearch -x -H ldap://192.168.1.20 -D "cn=admin,dc=corp,dc=local" -W -b dc=corp,dc=local', 'Bind with user creds'],
      ['ldapsearch -x -H ldap://192.168.1.20 -b dc=corp,dc=local "(objectClass=user)"', 'List directory users'],
      ['ldapsearch -x -H ldap://192.168.1.20 -b dc=corp,dc=local cn', 'Return only common names'],
      ['ldapsearch -x -H ldap://192.168.1.20 -b dc=corp,dc=local "(mail=*)" mail', 'Find entries with email attributes'],
    ]),
  },
  {
    name: 'dig',
    category: 'Information Gathering',
    description: 'DNS query inspection',
    examples: makeExamples([
      ['dig example.com', 'Resolve default records'],
      ['dig any example.com', 'Ask for all available records'],
      ['dig mx example.com', 'Check mail exchangers'],
      ['dig @8.8.8.8 example.com a', 'Use a custom resolver'],
      ['dig +short txt example.com', 'Get concise TXT output'],
    ]),
  },
  {
    name: 'traceroute',
    category: 'Information Gathering',
    description: 'Network path discovery',
    examples: makeExamples([
      ['traceroute example.com', 'Trace route to a host'],
      ['traceroute -I example.com', 'Use ICMP probes'],
      ['traceroute -T -p 443 example.com', 'Trace using TCP on port 443'],
      ['traceroute -m 8 example.com', 'Limit max hops'],
      ['traceroute -n example.com', 'Skip DNS name resolution'],
    ]),
  },
  {
    name: 'enum4linux-ng',
    category: 'Information Gathering',
    description: 'Modern Windows/SMB enumeration',
    examples: makeExamples([
      ['enum4linux-ng -A 192.168.1.10', 'Run all enumeration checks'],
      ['enum4linux-ng -u admin -p Password123 -A 192.168.1.10', 'Authenticate and enumerate'],
      ['enum4linux-ng -S 192.168.1.10', 'List SMB shares only'],
      ['enum4linux-ng -U 192.168.1.10', 'List users only'],
      ['enum4linux-ng --rid-brute 192.168.1.10', 'Brute-force RID user names'],
    ]),
  },
  {
    name: 'Nikto',
    category: 'Vulnerability Analysis',
    description: 'Web server vulnerability scanning',
    examples: makeExamples([
      ['nikto -h https://example.com', 'Scan a web server for common issues'],
      ['nikto -h https://example.com -ssl', 'Force SSL/TLS mode'],
      ['nikto -h https://example.com -output nikto.html -Format htm', 'Export HTML report'],
      ['nikto -h https://example.com -Tuning b', 'Scan only software identification tests'],
      ['nikto -h https://example.com -Plugins apacheusers', 'Run a specific plugin set'],
    ]),
  },
  {
    name: 'sqlmap',
    category: 'Web Application',
    description: 'Automated SQL injection testing',
    examples: makeExamples([
      ['sqlmap -u "https://site/item.php?id=1" --batch', 'Test a GET parameter quickly'],
      ['sqlmap -u "https://site/item.php?id=1" --dbs', 'Enumerate databases'],
      ['sqlmap -r request.txt --batch', 'Replay a captured raw request'],
      ['sqlmap -u "https://site/item.php?id=1" --cookie="PHPSESSID=abc"', 'Test with an auth cookie'],
      ['sqlmap -u "https://site/item.php?id=1" --dump -D appdb -T users', 'Dump table data after confirmation'],
    ]),
  },
  {
    name: 'Burp Suite',
    category: 'Web Application',
    description: 'Intercepting proxy and app testing',
    examples: makeExamples([
      ['burpsuite', 'Launch the Burp Suite GUI'],
      ['java -jar burpsuite_community.jar', 'Start Burp from a jar file'],
      ['burpsuite --project-file project.burp', 'Open a saved Burp project'],
      ['burpsuite --config-file config.json', 'Start with a custom config'],
      ['burpsuite --user-config-file user-options.json', 'Load a user options profile'],
    ]),
  },
  {
    name: 'wpscan',
    category: 'Web Application',
    description: 'WordPress security enumeration',
    examples: makeExamples([
      ['wpscan --url https://example.com --enumerate u', 'Enumerate WordPress users'],
      ['wpscan --url https://example.com --enumerate vp', 'Check vulnerable plugins'],
      ['wpscan --url https://example.com --api-token TOKEN', 'Enable vulnerability API lookups'],
      ['wpscan --url https://example.com --plugins-detection aggressive', 'Run aggressive plugin checks'],
      ['wpscan --url https://example.com --passwords rockyou.txt --usernames admin', 'Run a password attack'],
    ]),
  },
  {
    name: 'Hydra',
    category: 'Password Attacks',
    description: 'Online password brute-force attacks',
    examples: makeExamples([
      ['hydra -l admin -P rockyou.txt ssh://10.10.10.10', 'Brute-force SSH login'],
      ['hydra -L users.txt -P rockyou.txt ftp://10.10.10.10', 'Try many users on FTP'],
      ['hydra -l admin -P passwords.txt http-post-form "/login:user=^USER^&pass=^PASS^:F=Invalid"', 'Attack a web login form'],
      ['hydra -l admin -p Winter2024! rdp://10.10.10.10', 'Try a single password over RDP'],
      ['hydra -M hosts.txt -l root -P pass.txt ssh', 'Attack many SSH hosts from a list'],
    ]),
  },
  {
    name: 'John the Ripper',
    category: 'Password Attacks',
    description: 'Offline password cracking',
    examples: makeExamples([
      ['john hashes.txt', 'Crack hashes with default mode'],
      ['john --wordlist=rockyou.txt hashes.txt', 'Use a common wordlist'],
      ['john --rules --wordlist=rockyou.txt hashes.txt', 'Apply mangling rules'],
      ['john --format=raw-md5 hashes.txt', 'Force a specific hash type'],
      ['john --show hashes.txt', 'Display cracked passwords'],
    ]),
  },
  {
    name: 'Aircrack-ng',
    category: 'Wireless Attacks',
    description: 'Wi-Fi auditing and cracking',
    examples: makeExamples([
      ['airmon-ng start wlan0', 'Enable monitor mode'],
      ['airodump-ng wlan0mon', 'Capture nearby wireless traffic'],
      ['airodump-ng -c 6 --bssid AA:BB:CC:DD:EE:FF -w capture wlan0mon', 'Target one AP and save capture'],
      ['aireplay-ng --deauth 10 -a AA:BB:CC:DD:EE:FF wlan0mon', 'Send deauth packets'],
      ['aircrack-ng capture.cap -w rockyou.txt', 'Crack captured WPA handshake'],
    ]),
  },
  {
    name: 'Wireshark',
    category: 'Sniffing & Spoofing',
    description: 'Packet capture and protocol analysis',
    examples: makeExamples([
      ['wireshark', 'Open the packet analyzer UI'],
      ['wireshark -i eth0', 'Open and start capturing on one interface'],
      ['wireshark -k -i any', 'Start capture immediately'],
      ['wireshark -r capture.pcapng', 'Open an existing capture file'],
      ['tshark -i eth0 -Y http', 'CLI packet capture with display filter'],
    ]),
  },
  {
    name: 'Ettercap',
    category: 'Sniffing & Spoofing',
    description: 'MITM and sniffing operations',
    examples: makeExamples([
      ['ettercap -T -q -i eth0', 'Start text UI sniffing on an interface'],
      ['ettercap -T -M arp /10.0.0.1// /10.0.0.2//', 'Run ARP MITM between two hosts'],
      ['ettercap -G', 'Launch graphical interface'],
      ['ettercap -T -P dns_spoof -M arp /victim// /gateway//', 'Run DNS spoof plugin'],
      ['ettercap -T -M arp:remote /192.168.1.5// /192.168.1.1//', 'Spoof against remote network path'],
    ]),
  },
  {
    name: 'Metasploit',
    category: 'Exploitation',
    description: 'Exploit framework and payload delivery',
    examples: makeExamples([
      ['msfconsole', 'Open the Metasploit console'],
      ['search smb', 'Search modules by keyword'],
      ['use exploit/windows/smb/ms17_010_eternalblue', 'Select an exploit module'],
      ['set RHOSTS 10.10.10.10', 'Set target hosts'],
      ['run', 'Execute the configured module'],
    ]),
  },
  {
    name: 'Searchsploit',
    category: 'Exploitation',
    description: 'Offline exploit database search',
    examples: makeExamples([
      ['searchsploit apache 2.4', 'Search by product and version'],
      ['searchsploit wordpress plugin backup', 'Find plugin exploits'],
      ['searchsploit -m 49757', 'Copy an exploit locally'],
      ['searchsploit --nmap scan.xml', 'Match exploits to an Nmap XML report'],
      ['searchsploit -w apache 2.4', 'Show exploit-db web links'],
    ]),
  },
  {
    name: 'Meterpreter',
    category: 'Post Exploitation',
    description: 'Interactive post-exploitation payload',
    examples: makeExamples([
      ['sysinfo', 'Show victim OS details'],
      ['getuid', 'Show current session user'],
      ['ps', 'List running processes'],
      ['hashdump', 'Dump local password hashes when allowed'],
      ['download secrets.txt', 'Pull a file from the compromised host'],
    ]),
  },
  {
    name: 'Autopsy',
    category: 'Forensics',
    description: 'Digital forensics investigation suite',
    examples: makeExamples([
      ['autopsy', 'Launch the Autopsy UI'],
      ['autopsy --nosplash', 'Start without splash screen'],
      ['autopsy --verbose', 'Start with verbose logs'],
      ['java -jar autopsy.jar', 'Launch from jar in a custom setup'],
      ['autopsy --userdir /cases/autopsy-profile', 'Use a separate profile directory'],
    ]),
  },
  {
    name: 'Dradis',
    category: 'Reporting',
    description: 'Security reporting and collaboration',
    examples: makeExamples([
      ['dradis-ce', 'Start the Dradis community edition'],
      ['dradis-ce start', 'Launch the Dradis service'],
      ['dradis-ce stop', 'Stop the Dradis service'],
      ['dradis-ce status', 'Check service state'],
      ['dradis-ce bundle exec rails console', 'Open a Rails console for Dradis'],
    ]),
  },
  {
    name: 'Ghidra',
    category: 'Reverse Engineering',
    description: 'Decompiler and reverse engineering suite',
    examples: makeExamples([
      ['ghidraRun', 'Launch the Ghidra UI'],
      ['analyzeHeadless /tmp/proj testProj -import sample.bin', 'Run headless import and analysis'],
      ['analyzeHeadless /tmp/proj testProj -process sample.bin -postScript script.java', 'Run a post-analysis script'],
      ['ghidraRun sample.bin', 'Open a target quickly in some wrappers'],
      ['support/analyzeHeadless /tmp/proj demo -import malware.exe', 'Use bundled headless runner path'],
    ]),
  },
  {
    name: 'SEToolkit',
    category: 'Social Engineering',
    description: 'Social engineering attack framework',
    examples: makeExamples([
      ['setoolkit', 'Launch the toolkit menu'],
      ['sudo setoolkit', 'Run with elevated privileges when needed'],
      ['setoolkit --help', 'Show command-line help'],
      ['setoolkit --update', 'Update toolkit components'],
      ['setoolkit --verbose', 'Run with more console detail'],
    ]),
  },
  {
    name: 'Weevely',
    category: 'Maintaining Access',
    description: 'Web shell management',
    examples: makeExamples([
      ['weevely generate secretpass agent.php', 'Generate a PHP web shell'],
      ['weevely http://target.com/agent.php secretpass', 'Connect to a deployed shell'],
      ['weevely http://target.com/agent.php secretpass :system_info', 'Collect system details'],
      ['weevely http://target.com/agent.php secretpass :file_download /etc/passwd', 'Download a file'],
      ['weevely http://target.com/agent.php secretpass :shell whoami', 'Run a shell command'],
    ]),
  },
  {
    name: 'SlowHTTPTest',
    category: 'Stress Testing',
    description: 'Application layer DoS testing',
    examples: makeExamples([
      ['slowhttptest -H -c 1000 -g -o test -i 10 -r 200 -t GET -u https://example.com -x 24 -p 3', 'Run slow headers test'],
      ['slowhttptest -B -c 500 -u https://example.com', 'Run slow body attack'],
      ['slowhttptest -R -u https://example.com -c 400 -p 3', 'Run range header attack'],
      ['slowhttptest -X -u https://example.com -c 400', 'Run slow read test'],
      ['slowhttptest -H -u https://example.com -o slowhttp-report -l 300', 'Generate a longer-duration report'],
    ]),
  },
  {
    name: 'Proxmark3',
    category: 'Hardware Hacking',
    description: 'RFID and NFC research platform',
    examples: makeExamples([
      ['proxmark3 /dev/ttyACM0', 'Connect to a USB Proxmark device'],
      ['hw version', 'Check firmware and hardware status'],
      ['hf search', 'Search for high-frequency tags'],
      ['lf search', 'Search for low-frequency tags'],
      ['script run hf_mf_chk', 'Run a bundled Mifare helper script'],
    ]),
  },
];

export default function ToolExplorer() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedToolName, setSelectedToolName] = useState('Nmap');
  const [treeOpen, setTreeOpen] = useState(true);
  const [layoutMode, setLayoutMode] = useState('split');

  const filteredTools = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return KALI_TOOL_INDEX.filter((tool) => {
      const categoryMatch = activeCategory === 'All' || tool.category === activeCategory;
      const exampleText = tool.examples.map((example) => `${example.command} ${example.comment}`).join(' ');
      const queryMatch = !needle || `${tool.name} ${tool.category} ${tool.description} ${exampleText}`.toLowerCase().includes(needle);
      return categoryMatch && queryMatch;
    });
  }, [query, activeCategory]);

  const groupedTools = useMemo(() => {
    const groups = new Map();
    filteredTools.forEach((tool) => {
      if (!groups.has(tool.category)) groups.set(tool.category, []);
      groups.get(tool.category).push(tool);
    });
    return Array.from(groups.entries()).map(([category, tools]) => ({ category, tools }));
  }, [filteredTools]);

  const selectedTool = useMemo(() => {
    return filteredTools.find((tool) => tool.name === selectedToolName) || filteredTools[0] || null;
  }, [filteredTools, selectedToolName]);

  useEffect(() => {
    if (!filteredTools.length) return;
    if (!filteredTools.some((tool) => tool.name === selectedToolName)) {
      setSelectedToolName(filteredTools[0].name);
    }
  }, [filteredTools, selectedToolName]);

  return (
    <div
      className="min-h-screen relative"
      style={{
        cursor: `url("data:image/svg+xml;utf8,${encodeURIComponent(`
          <svg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 44 44' fill='none'>
            <defs>
              <filter id='g' x='-80%' y='-80%' width='260%' height='260%'>
                <feGaussianBlur stdDeviation='3.2' result='blur'/>
                <feMerge>
                  <feMergeNode in='blur'/>
                  <feMergeNode in='SourceGraphic'/>
                </feMerge>
              </filter>
              <linearGradient id='rgb' x1='6' y1='6' x2='34' y2='34' gradientUnits='userSpaceOnUse'>
                <stop stop-color='#ff4d4d'/>
                <stop offset='0.24' stop-color='#ffb84d'/>
                <stop offset='0.48' stop-color='#42f5b9'/>
                <stop offset='0.72' stop-color='#56c2ff'/>
                <stop offset='1' stop-color='#b06eff'/>
              </linearGradient>
            </defs>
            <path d='M8 6L8 30L14.4 23.6L19 35L23 33.2L18.6 21.8L28 21.4L8 6Z' fill='white' filter='url(%23g)'/>
            <path d='M8 6L8 30L14.4 23.6L19 35L23 33.2L18.6 21.8L28 21.4L8 6Z' fill='url(%23rgb)' fill-opacity='0.52'/>
            <path d='M10 8L10 26L14.2 21.9L18 31.2L20.8 29.9L17.2 20.6L24.2 20.3L10 8Z' fill='url(%23rgb)' fill-opacity='0.92'/>
          </svg>
        `)}") 8 6, auto`,
      }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(110,143,190,0.14),transparent_24%),radial-gradient(circle_at_82%_16%,rgba(216,179,106,0.14),transparent_20%),radial-gradient(circle_at_52%_88%,rgba(147,183,171,0.12),transparent_24%)]" />
      </div>
      <div className="max-w-7xl mx-auto px-4 py-10 relative" data-testid="tool-explorer-page">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="holo-panel holo-float mb-10 p-6 sm:p-7"
        >
          <div className="holo-grid" />
          <div className="holo-radar" />
          <div className="holo-pulse" />
          <div className="holo-content">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge className="border-0 bg-[var(--cyber-blue)]/12 text-[var(--cyber-blue)]">TOOL EXPLORER</Badge>
              <Badge className="border-0 bg-[var(--cyber-blue)]/10 text-[#8fd7ff]">Blue Hologram</Badge>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight font-['Orbitron'] mb-3 text-[var(--cyber-text)]">
              Search <span className="neon-text">Kali Tools</span>
            </h1>
            <p className="max-w-3xl text-[var(--cyber-muted)]">
              Har tool ke liye ab kam se kam 5 command examples diye gaye hain, saath mein short explanation bhi hai.
            </p>
            <div className="mt-5 flex flex-wrap gap-3 text-sm text-[var(--cyber-muted)]">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2">
                <span className="text-[var(--cyber-text)] font-semibold">{filteredTools.length}</span> visible tools
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2">
                <span className="text-[var(--cyber-text)] font-semibold">{KALI_CATEGORIES.length}</span> categories
              </div>
            </div>
          </div>
        </motion.div>

        <div className="holo-panel holo-float-delayed mb-8 p-5">
          <div className="holo-grid" />
          <div className="holo-content flex items-center gap-3">
            <Search className="w-4 h-4 text-[var(--cyber-blue)]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Kali tool (e.g. nmap, sqlmap, metasploit)"
              className="h-12 rounded-2xl border-white/10 bg-black/10 text-[var(--cyber-text)] focus:border-[var(--cyber-blue)] focus:ring-1 focus:ring-[var(--cyber-blue)]"
            />
          </div>
        </div>

        <div className="mb-8">
          <div className="mb-3 text-xs uppercase tracking-[0.24em] text-[var(--cyber-muted)]">Tools by Category</div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setActiveCategory('All')} className={`group relative overflow-hidden rounded-2xl border px-3 py-2 text-xs transition-all ${activeCategory === 'All' ? 'border-[var(--cyber-orange)]/40 bg-[linear-gradient(135deg,rgba(216,179,106,0.14),rgba(216,179,106,0.06))] text-[var(--cyber-orange)] shadow-[0_0_24px_rgba(216,179,106,0.14)]' : 'border-white/10 bg-white/[0.03] text-[var(--cyber-muted)] hover:text-[var(--cyber-text)] hover:bg-white/[0.06]'}`}>
              <span className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_60%)] opacity-60" />
              <span className="relative">All</span>
            </button>
            {KALI_CATEGORIES.map((category) => (
              <button key={category.name} type="button" onClick={() => setActiveCategory(category.name)} className={`group relative overflow-hidden rounded-2xl border px-3 py-2 text-xs transition-all ${activeCategory === category.name ? 'border-[var(--cyber-blue)]/40 bg-[linear-gradient(135deg,rgba(0,194,255,0.14),rgba(110,143,190,0.08))] text-[var(--cyber-blue)] shadow-[0_0_24px_rgba(0,194,255,0.12)]' : 'border-white/10 bg-white/[0.03] text-[var(--cyber-muted)] hover:text-[var(--cyber-text)] hover:bg-white/[0.06]'}`}>
                <span className="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.08),transparent)] opacity-60" />
                <span className="relative">{category.name} ({category.count})</span>
              </button>
            ))}
          </div>
        </div>

        <div className={`grid gap-5 ${layoutMode === 'full' || !treeOpen ? 'xl:grid-cols-1' : 'xl:grid-cols-[340px_minmax(0,1fr)]'}`}>
          {layoutMode !== 'full' && treeOpen && (
            <motion.aside
              initial={{ opacity: 0, x: -18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
              className="holo-panel holo-float p-4"
            >
              <div className="holo-grid" />
              <div className="holo-content">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.26em] text-[var(--cyber-muted)]">Explorer Tree</div>
                    <div className="mt-1 text-sm text-[var(--cyber-text)]">Kali categories</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setLayoutMode('full')}
                      className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] p-2 text-[var(--cyber-muted)] transition-all hover:text-[var(--cyber-text)] hover:border-[var(--cyber-blue)]/30"
                      aria-label="Full view"
                    >
                      <span className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,194,255,0.16),transparent_70%)] opacity-0 transition-opacity group-hover:opacity-100" />
                      <Maximize2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTreeOpen(false)}
                      className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] p-2 text-[var(--cyber-muted)] transition-all hover:text-[var(--cyber-text)] hover:border-[var(--cyber-orange)]/30"
                      aria-label="Close tree"
                    >
                      <span className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(216,179,106,0.16),transparent_70%)] opacity-0 transition-opacity group-hover:opacity-100" />
                      <PanelLeftClose className="h-4 w-4 text-[var(--cyber-orange)]" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {groupedTools.map((group) => (
                    <div key={group.category} className="rounded-[22px] border border-white/10 bg-black/10 p-3">
                      <button
                        type="button"
                        onClick={() => setActiveCategory(group.category)}
                        className="flex w-full items-center justify-between gap-3 rounded-2xl px-2 py-2 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <ChevronRight className="h-4 w-4 text-[var(--cyber-orange)] rotate-90" />
                          <span className="text-sm font-medium text-[var(--cyber-text)]">{group.category}</span>
                        </div>
                        <Badge className="border-0 bg-[var(--cyber-blue)]/10 text-[var(--cyber-blue)] text-[10px]">
                          {group.tools.length}
                        </Badge>
                      </button>

                      <div className="mt-2 space-y-1 pl-6">
                        {group.tools.map((tool) => (
                          <button
                            key={tool.name}
                            type="button"
                            onClick={() => {
                              setActiveCategory(group.category);
                              setSelectedToolName(tool.name);
                            }}
                            className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                              selectedTool?.name === tool.name
                                ? 'bg-[var(--cyber-blue)]/10 text-[var(--cyber-blue)]'
                                : 'text-[var(--cyber-muted)] hover:bg-white/[0.04] hover:text-[var(--cyber-text)]'
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${selectedTool?.name === tool.name ? 'bg-[var(--cyber-blue)]' : 'bg-[var(--cyber-blue)]/70'}`} />
                            <span>{tool.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.aside>
          )}

          {selectedTool && (
            <motion.div
              key={`${selectedTool.category}-${selectedTool.name}`}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
              className="holo-panel holo-float-delayed p-5 sm:p-6"
            >
              <div className="holo-grid" />
              <div className="holo-radar" />
              <div className="holo-pulse" />
              <div className="holo-content">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                        <Layers3 className="h-4 w-4 text-[var(--cyber-blue)]" />
                      </div>
                      <div>
                        <div className="text-lg font-bold text-[var(--cyber-text)]">{selectedTool.name}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.2em] text-[var(--cyber-muted)]">{selectedTool.category}</div>
                      </div>
                    </div>
                    <div className="mt-3 text-sm text-[var(--cyber-muted)]">{selectedTool.description}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!treeOpen && (
                      <button
                        type="button"
                        onClick={() => {
                          setTreeOpen(true);
                          setLayoutMode('split');
                        }}
                        className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] p-2 text-[var(--cyber-muted)] transition-all hover:text-[var(--cyber-text)] hover:border-[var(--cyber-blue)]/30"
                        aria-label="Open tree"
                      >
                        <span className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,194,255,0.16),transparent_70%)] opacity-0 transition-opacity group-hover:opacity-100" />
                        <PanelLeftOpen className="h-4 w-4 text-[var(--cyber-blue)]" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setLayoutMode((prev) => (prev === 'split' ? 'full' : 'split'))}
                      className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] p-2 text-[var(--cyber-muted)] transition-all hover:text-[var(--cyber-text)] hover:border-[var(--cyber-blue)]/30"
                      aria-label={layoutMode === 'split' ? 'Full view' : 'Split view'}
                    >
                      <span className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,194,255,0.16),transparent_70%)] opacity-0 transition-opacity group-hover:opacity-100" />
                      {layoutMode === 'split' ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                    </button>
                    <Badge className="border-0 bg-[var(--cyber-blue)]/10 text-[var(--cyber-blue)] text-[10px]">Selected</Badge>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {selectedTool.examples.map((example, index) => (
                    <div key={`${selectedTool.name}-${index + 1}`} className="rounded-[22px] border border-white/10 bg-black/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-[var(--cyber-muted)]">
                        <TerminalSquare className="w-3.5 h-3.5 text-[var(--cyber-blue)]" />
                        Example {index + 1}
                      </div>
                      <code className="mt-2 block break-all text-xs text-[var(--cyber-orange)]">{example.command}</code>
                      <div className="mt-2 flex items-start gap-2 text-xs text-[var(--cyber-muted)]">
                        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--cyber-green)]" />
                        <span>{example.comment}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {filteredTools.length === 0 && (
          <div className="mt-8 rounded-[24px] border border-yellow-500/20 bg-yellow-500/5 p-4 text-sm text-yellow-300">
            No Kali tools matched this search.
          </div>
        )}
      </div>
    </div>
  );
}
