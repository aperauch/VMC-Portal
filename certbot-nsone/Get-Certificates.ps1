

$certs = certbot.exe certificates
#Write-Host $certs

$c = @'

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Found the following certs:
  Certificate Name: euclab.net
    Serial Number: 4c7c0abbfae1ee597636d6ea57eaa40dd15
    Domains: euclab.net *.euclab.net
    Expiry Date: 2021-02-15 20:34:22+00:00 (VALID: 84 days)
    Certificate Path: C:\Certbot\live\euclab.net\fullchain.pem
    Private Key Path: C:\Certbot\live\euclab.net\privkey.pem
  Certificate Name: psolab.net
    Serial Number: 3ebbedf96ec3682ce35398acacc51420898
    Domains: psolab.net *.psolab.net
    Expiry Date: 2021-02-15 20:32:11+00:00 (VALID: 84 days)
    Certificate Path: C:\Certbot\live\psolab.net\fullchain.pem
    Private Key Path: C:\Certbot\live\psolab.net\privkey.pem
  Certificate Name: test1.euclab.net
    Serial Number: 37a7b1f117e603315809badba65b9d37a07
    Domains: test1.euclab.net
    Expiry Date: 2021-02-20 00:52:23+00:00 (VALID: 88 days)
    Certificate Path: C:\Certbot\live\test1.euclab.net\fullchain.pem
    Private Key Path: C:\Certbot\live\test1.euclab.net\privkey.pem
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
'@


function Get-CertObject {
    $certObject = [PSCustomObject]@{
        name = $null
        serialNumber = $null
        domains = $null
        expiration = $null
        status = $null
    }

    return $certObject
}

$names = $serialNumbers = $domains = $expirations = $statuses = $certObjects = @()

$lines = $certs -split '\r'
foreach ($line in $lines) {
    if ($line -match "Certificate Name:") {
        $names += ($line -split ": ")[1]
    }

    if ($line -match "Serial Number:") {
        $serialNumbers += ($line -split ": ")[1]
    }

    if ($line -match "Domains:") {
        $domains += ($line -split ": ")[1] -replace " ", ", "
    }

    if ($line -match "Expiry Date:") {
        $expirations += (($line -split ": ")[1] -split " ")[0]
        $statuses += ($line -split "\(")[1] -replace "\)", ""
    }
}

for ($i = 0; $i -lt $names.Count; $i++) {
    $certObject = Get-CertObject
    $certObject.name = $names[$i]
    $certObject.serialNumber = $serialNumbers[$i]
    $certObject.domains = $domains[$i]
    $certObject.expiration = $expirations[$i]
    $certObject.status = $statuses[$i]

    $certObjects += $certObject
}

$output = $certObjects | ConvertTo-Json -Compress
Write-Host $output