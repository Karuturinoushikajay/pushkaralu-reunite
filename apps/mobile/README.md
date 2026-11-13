# @pushkaralu/mobile

Flutter pilgrim + volunteer app (Steps 3–5).

## Prerequisites

Install Flutter 3.24+ and put it on your PATH, then:

```bash
cd apps/mobile
flutter create . --project-name pushkaralu_reunite --org in.gov.ap.pushkaralu
flutter pub get
flutter gen-l10n
flutter run
```

Point the API at your machine (Android emulator uses `10.0.2.2`):

```bash
flutter run --dart-define=API_BASE=http://10.0.2.2:3000
```

## Flows covered

- Login / Create account / OTP / Account ready + wristband QR
- Offline map download (progress UI; region Rajamahendravaram)
- Home, News, My List, Profile, Booths tabs
- Add members, Report Missing (confirm + GPS), RED state, booth route details
- Volunteer login (VOL-ID + OTP), nearby alerts, QR scan, log found person, match/handover steps

Design tokens: navy `#12263F`, amber `#E8A33D`, alert `#B42318`, success `#1B7F4B`, background `#F4F6F8`.
Strings live in `lib/l10n/*.arb` (en / te / hi).
