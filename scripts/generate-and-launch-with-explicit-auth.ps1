<#
.SYNOPSIS
A PowerShell script that creates, downloads and runs Citrix ICA file from authenticated store
Author: Ryan Butler 7-26-16
Version: 0.9
.DESCRIPTION
A Powershell v3 Script that utilizes invoke-webrequest to create, download and launch an desktop via Citrix ICA file from Storefront. Script uses explicit authentication.
.PARAMETER sfurl
Storefront WEB URL (MANDATORY)
.PARAMETER desktop
Published desktop name (MANDATORY)
.PARAMETER icapath
Location to save and run ICA from (MANDATORY)
.PARAMETER username
username to login with (MANDATORY)
.PARAMETER password
password to login with (MANDATORY)
.PARAMETER domain
domain to use (MANDATORY)
.EXAMPLE
.\generate-and-launch-with-explicit-auth.ps1 -sfurl "https://go.citrite.net/Citrix/StoreWeb/" -icapath "D:\myica.ica" -username "<username>" -password "<password>" -domain "citrix.com" -desktop "Managed Win10 LAS Desktop"
#>
Param
(
  [Parameter(Mandatory=$true)]$sfurl,
  [Parameter(Mandatory=$true)]$desktop,
  [Parameter(Mandatory=$true)]$icapath,
  [Parameter(Mandatory=$true)]$username,
  [Parameter(Mandatory=$true)]$password,
  [Parameter(Mandatory=$true)]$domain
)
CLS
write-host "Requesting ICA file. Please Wait..." -ForegroundColor Yellow
write-host "sfurl: $sfurl"
write-host "desktop: $desktop"
write-host "icapath: $icapath"
write-host "username: $username"
write-host "domain: $domain"

#Remove old ica file if found
if (test-path $icapath)
{
  write-host "Removing OLD ICA file..." -ForegroundColor Yellow
  Remove-Item $icapath -Force
}


#start by loading main SF page
$headers = @{
  "Accept"='text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8';
  "Upgrade-Insecure-Requests"="1";
}

Invoke-WebRequest -Uri ($sfurl) -Method GET -Headers $headers -SessionVariable SFSession|Out-Null

#Gets required tokens
$headers = @{
  "Accept"='application/xml, text/xml, */*; q=0.01';
  "Content-Length"="0";
  "X-Requested-With"="XMLHttpRequest";
  "X-Citrix-IsUsingHTTPS"="Yes";
  "Referer"=$sfurl;
}

Invoke-WebRequest -Uri ($sfurl + "Home/Configuration") -Method POST -Headers $headers -WebSession $sfsession|Out-Null

$csrf = $sfsession.cookies.GetCookies($sfurl)|where{$_.name -like "CsrfToken"}
$cookiedomain = $csrf.Domain

#Gets needed cookie values
$headers = @{
  "Content-Type"='application/x-www-form-urlencoded; charset=UTF-8';
  "Accept"='application/json, text/javascript, */*; q=0.01';
  "X-Citrix-IsUsingHTTPS"= "Yes";
  "Csrf-Token"=$csrf.value;
  "Referer"=$sfurl;
  "format"='json&resourceDetails=Default';
}
Invoke-WebRequest -Uri ($sfurl + "Resources/List") -Method POST -Headers $headers -WebSession $SFSession|Out-Null

#Gets authentication methods
$headers = @{
  "Accept"='application/xml, text/xml, */*; q=0.01';
  "Content-Length"="0";
  "X-Citrix-IsUsingHTTPS"="Yes";
  "Referer"=$sfurl;
  "Csrf-Token"=$csrf.value;
}

Invoke-WebRequest -Uri ($sfurl + "Authentication/GetAuthMethods") -Method POST -Headers $headers -WebSession $sfsession|Out-Null

#Start Login Process
$headers = @{
  "Accept"="application/xml, text/xml, */*; q=0.01";
  "Csrf-Token"=$csrf.Value;
  "X-Citrix-IsUsingHTTPS"="Yes";
  "Content-Length"="0";
}

#Add cookies that would normally prompt
$cookie = New-Object System.Net.Cookie
$cookie.Name = "CtxsUserPreferredClient"
$cookie.Value = "Native"
$cookie.Domain = $cookiedomain
$sfsession.Cookies.Add($cookie)

$cookie = New-Object System.Net.Cookie
$cookie.Name = "CtxsClientDetectionDon"
$cookie.Value = "true"
$cookie.Domain = $cookiedomain
$sfsession.Cookies.Add($cookie)

$cookie = New-Object System.Net.Cookie
$cookie.Name = "CtxsHasUpgradeBeenShown"
$cookie.Value = "true"
$cookie.Domain = $cookiedomain
$sfsession.Cookies.Add($cookie)


Invoke-WebRequest -Uri ($sfurl + "ExplicitAuth/Login") -Method POST -Headers $headers -WebSession $SFSession|Out-Null

#Explicit Authentication
$headers = @{
  "Accept"="application/xml, text/xml, */*; q=0.01";
  "Accept-Encoding"="gzip, deflate, br";
  "Accept-Language"="en-US,en;q=0.8";
  "X-Requested-With"="XMLHttpRequest";
}

$body = @{
  "domain"=$domain;
  "loginBtn"="Log On";
  "password"=$password;
  "saveCredentials"="false";
  "username"=$username;
  "StateContext"="";
}


$login = Invoke-WebRequest -Uri ($sfurl + "ExplicitAuth/LoginAttempt") -Method POST -Headers $headers -Body $body -WebSession $SFSession

#Gets resources and required ICA URL
$headers = @{
  "Content-Type"='application/x-www-form-urlencoded; charset=UTF-8';
  "Accept"='application/json, text/javascript, */*; q=0.01';
  "X-Citrix-IsUsingHTTPS"= "Yes";
  "Csrf-Token"=$csrf.value;
  "Referer"=$sfurl;
  "X-Requested-With"="XMLHttpRequest";
}

$body = @{
  "format"='json';
  "resourceDetails"='Full';
}

$content = Invoke-WebRequest -Uri ($sfurl + "Resources/List") -Method POST -Headers $headers -body $body -WebSession $SFSession

#Creates ICA file
$resources = $content.content | convertfrom-json
$foundResource = $resources.resources|where{$_.name -like "$desktop" -and $_.type -eq "Citrix.MPS.Desktop"}


if ($foundResource.count) {
  write-host "MULTIPLE APPS FOUND for $desktop.  Check APP NAME!" -ForegroundColor Red
  $foundResource|select id,name
} elseif($foundResource -eq $Null -And $resources.resources.count) {
  foreach ($resource in $resources.resources.GetEnumerator()) {
    $resourceName = $resource.name
    Write-Host "$resourceName"
  }
  Write-Host "No matching desktop found. Choose from any of the above desktops" -Foregroundcolor Red
} else {
  Write-Host "Matched Resource: $foundResource.name"
  $launchUrl = $sfurl + $foundResource.launchurl + '?CsrfToken=' + $csrf.value + "&IsUsingHttps=Yes"
  Write-Host "Launch URL $launchUrl"
  Invoke-WebRequest -Uri ($launchUrl) -Method GET -WebSession $SFSession -OutFile $icapath|Out-Null
  if (test-path $icapath)
  {
    write-host "Launching created ICA..."
    Start-Process $icapath
  }
  else
  {
    write-host "ICA not found check configuration"
  }
}
