# Windows-only manual QA: creates fictional speech in an ignored test directory.
# No microphone, credentials, cloud provider or personal information is used.
Add-Type -AssemblyName System.Speech
$qaWebRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$qaAudioRoot = Join-Path $qaWebRoot 'public/qa-fixtures'
New-Item -ItemType Directory -Force -Path $qaAudioRoot | Out-Null
$qaAnswers = @(
    'First I would listen to the customer without interrupting. Then I would repeat the order to confirm what they expected. If the order was wrong, I would ask my supervisor to help correct it. Finally I would check the replacement and confirm that the customer received the right items.',
    'I would check the total on the register before taking payment. Next I would count the money the customer gave me, calculate the change, and count it back carefully. If the drawer did not match the expected amount, I would tell my supervisor and follow the store procedure instead of hiding the mistake.'
)
for ($qaIndex = 0; $qaIndex -lt $qaAnswers.Count; $qaIndex++) {
    $qaVoice = New-Object System.Speech.Synthesis.SpeechSynthesizer
    try {
        $qaVoice.SetOutputToWaveFile((Join-Path $qaAudioRoot ('answer' + ($qaIndex + 1) + '.wav')))
        $qaVoice.Speak($qaAnswers[$qaIndex])
    } finally { $qaVoice.Dispose() }
}
