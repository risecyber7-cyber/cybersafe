import { useMemo, useState } from 'react';
import { Search, TerminalSquare } from 'lucide-react';
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

  const filteredTools = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return KALI_TOOL_INDEX.filter((tool) => {
      const categoryMatch = activeCategory === 'All' || tool.category === activeCategory;
      const exampleText = tool.examples.map((example) => `${example.command} ${example.comment}`).join(' ');
      const queryMatch = !needle || `${tool.name} ${tool.category} ${tool.description} ${exampleText}`.toLowerCase().includes(needle);
      return categoryMatch && queryMatch;
    });
  }, [query, activeCategory]);

  return (
    <div className="min-h-screen relative">
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 py-10 relative" data-testid="tool-explorer-page">
        <div className="mb-10 animate-fade-in-up">
          <Badge className="bg-[#00D4FF]/10 text-[#00D4FF] border-0 mb-4">TOOL EXPLORER</Badge>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight font-['Orbitron'] mb-3">
            Search <span className="neon-text">Kali Tools</span>
          </h1>
          <p className="text-[#8B949E] max-w-3xl">
            Har tool ke liye ab kam se kam 5 command examples diye gaye hain, saath mein short explanation bhi hai.
          </p>
        </div>

        <div className="glass rounded-sm p-5 mb-8">
          <div className="flex items-center gap-3">
            <Search className="w-4 h-4 text-[#00D4FF]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Kali tool (e.g. nmap, sqlmap, metasploit)"
              className="bg-black/40 border-[#00D4FF]/10 text-white focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] rounded-sm"
            />
          </div>
        </div>

        <div className="mb-8">
          <div className="mb-3 text-xs uppercase tracking-[0.24em] text-[#8B949E]">Tools by Category</div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setActiveCategory('All')} className={`rounded-sm border px-3 py-2 text-xs transition-colors ${activeCategory === 'All' ? 'border-[#00D4FF]/40 bg-[#00D4FF]/10 text-[#00D4FF]' : 'border-white/10 text-[#8B949E] hover:text-white'}`}>All</button>
            {KALI_CATEGORIES.map((category) => (
              <button key={category.name} type="button" onClick={() => setActiveCategory(category.name)} className={`rounded-sm border px-3 py-2 text-xs transition-colors ${activeCategory === category.name ? 'border-[#00D4FF]/40 bg-[#00D4FF]/10 text-[#00D4FF]' : 'border-white/10 text-[#8B949E] hover:text-white'}`}>
                {category.name} ({category.count})
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {filteredTools.map((tool) => (
            <div key={`${tool.category}-${tool.name}`} className="glass glass-motion rounded-sm p-5 hover-lift">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-bold text-white">{tool.name}</div>
                  <div className="mt-1 text-sm text-[#8B949E]">{tool.description}</div>
                </div>
                <Badge className="bg-[#00D4FF]/10 text-[#00D4FF] border-0 text-[10px]">{tool.category}</Badge>
              </div>

              <div className="mt-4 space-y-3">
                {tool.examples.map((example, index) => (
                  <div key={`${tool.name}-${index + 1}`} className="rounded-sm border border-[#00D4FF]/10 bg-black/30 p-3">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-[#8B949E]">
                      <TerminalSquare className="w-3.5 h-3.5 text-[#00D4FF]" />
                      Example {index + 1}
                    </div>
                    <code className="mt-2 block break-all text-xs text-[#00FF9F]">{example.command}</code>
                    <div className="mt-2 text-xs text-[#8B949E]"># {example.comment}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {filteredTools.length === 0 && (
          <div className="mt-8 rounded-sm border border-yellow-500/20 bg-yellow-500/5 p-4 text-sm text-yellow-300">
            No Kali tools matched this search.
          </div>
        )}
      </div>
    </div>
  );
}
