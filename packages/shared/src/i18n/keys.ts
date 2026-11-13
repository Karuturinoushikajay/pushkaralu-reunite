/**
 * Canonical i18n keys. These are the single source of truth; the Flutter app's
 * ARB files and the dashboard's message catalog are generated/kept in sync from
 * here. No user-facing string should be hard-coded anywhere.
 */
export const I18N_KEYS = {
  appName: 'app.name',
  tagline: 'app.tagline',

  // Common actions
  actionLogin: 'action.login',
  actionCreateAccount: 'action.createAccount',
  actionSubmit: 'action.submit',
  actionVerify: 'action.verify',
  actionFinish: 'action.finish',
  actionContinue: 'action.continue',
  actionRetry: 'action.retry',
  actionAddMember: 'action.addMember',
  actionShowQr: 'action.showQr',
  actionReportMissing: 'action.reportMissing',
  actionNavigateToBooth: 'action.navigateToBooth',
  actionCallBooth: 'action.callBooth',
  actionLogout: 'action.logout',

  // Onboarding
  fieldUniqueId: 'field.uniqueId',
  fieldPassword: 'field.password',
  fieldConfirmPassword: 'field.confirmPassword',
  fieldName: 'field.name',
  fieldOwnPhone: 'field.ownPhone',
  fieldAddress: 'field.address',
  fieldAadhaarLast4: 'field.aadhaarLast4',
  fieldEmergencyPhone: 'field.emergencyPhone',
  fieldLivePhoto: 'field.livePhoto',
  consentReunification: 'consent.reunification',
  consentMinor: 'consent.minor',
  livePhotoNote: 'onboarding.livePhotoNote',

  // Bottom tabs
  tabHome: 'tab.home',
  tabNews: 'tab.news',
  tabMyList: 'tab.myList',
  tabProfile: 'tab.profile',
  tabBooths: 'tab.booths',

  // Home / states
  homeHelpline: 'home.helpline',
  homeLocation: 'home.location',
  homeSosPolice: 'home.sosPolice',
  homeSosMedical: 'home.sosMedical',
  homeOfflineMaps: 'home.offlineMaps',
  homeFamilyAccount: 'home.familyAccount',
  emptyNoMembersTitle: 'empty.noMembers.title',
  emptyNoMembersAction: 'empty.noMembers.action',
  stateLoading: 'state.loading',
  stateOffline: 'state.offline',
  stateErrorGeneric: 'state.error.generic',

  // Missing flow
  statusMissing: 'status.missing',
  statusFound: 'status.found',
  statusMatched: 'status.matched',
  statusReunited: 'status.reunited',
  reportMissingConfirm: 'report.confirm',
  reportMissingAlertSent: 'report.alertSent',

  // Profile
  profileLanguage: 'profile.language',
  profileOfflineMaps: 'profile.offlineMaps',
  profileEmergencyContacts: 'profile.emergencyContacts',
  profileConsent: 'profile.consent',
  profileWristbandQr: 'profile.wristbandQr',

  // Status detail lines (user UI)
  statusMissingDetail: 'status.missing.detail',
  statusFoundDetail: 'status.found.detail',
  statusMatchedDetail: 'status.matched.detail',
  statusReunitedDetail: 'status.reunited.detail',
  statusSafe: 'status.safe',

  // Home / list helpers
  homeTapNavigateBooth: 'home.tapNavigateBooth',
  myListTapHint: 'myList.tapHint',
  myListSelf: 'myList.self',

  // Booths
  boothsTapNavigate: 'booths.tapNavigate',
  boothsOfficer: 'booths.officer',
  boothsNavigate: 'booths.navigate',
  boothsNoLocation: 'booths.noLocation',
  boothsNoLocationTitle: 'booths.noLocationTitle',
  boothsNoLocationBody: 'booths.noLocationBody',
  boothsMapsUnavailableTitle: 'booths.mapsUnavailableTitle',
  boothsMapsUnavailableBody: 'booths.mapsUnavailableBody',

  // News / alerts
  newsAtBooth: 'news.atBooth',
  newsFound: 'news.found',
  newsMatchedHint: 'news.matchedHint',
  newsFoundHint: 'news.foundHint',
  newsAction: 'news.action',
  newsNotice: 'news.notice',

  // Add member
  addMemberTitle: 'addMember.title',
  fieldNameRequired: 'field.nameRequired',
  fieldOwnPhoneOptional: 'field.ownPhoneOptional',
  fieldAddressRequired: 'field.addressRequired',
  fieldAadhaarOptionalChild: 'field.aadhaarOptionalChild',
  fieldEmergencyPhoneRequired: 'field.emergencyPhoneRequired',
  placeholderFullName: 'placeholder.fullName',
  placeholderMobile10: 'placeholder.mobile10',
  placeholderVillageCity: 'placeholder.villageCity',
  placeholderAadhaar12: 'placeholder.aadhaar12',
  errorNameRequired: 'error.nameRequired',
  errorAddressRequired: 'error.addressRequired',
  errorEmergencyPhone: 'error.emergencyPhone',
  errorOwnPhone: 'error.ownPhone',
  errorAadhaar: 'error.aadhaar',

  // Case / booth collection (family)
  caseBoothCollection: 'case.boothCollection',
  caseLastSeenNearGhat: 'case.lastSeenNearGhat',
  caseOfficer: 'case.officer',
  caseWalkMeters: 'case.walkMeters',
  caseDefaultBooth: 'case.defaultBooth',
  caseStillMissing: 'case.stillMissing',
  caseFoundGoBooth: 'case.foundGoBooth',
  caseCollectOtpTitle: 'case.collectOtpTitle',
  caseCollectOtpHint: 'case.collectOtpHint',
  caseSendOtp: 'case.sendOtp',
  caseResendOtp: 'case.resendOtp',
  caseSentTo: 'case.sentTo',
  caseOtpPlaceholder: 'case.otpPlaceholder',
  caseVerifyOtp: 'case.verifyOtp',
  caseCollectedTitle: 'case.collectedTitle',
  caseCollectedBody: 'case.collectedBody',

  // Member detail
  memberPhotoDetails: 'member.photoDetails',
  memberLastSeenPin: 'member.lastSeenPin',
  memberFoundGoBooth: 'member.foundGoBooth',
  memberLastSeenGps: 'member.lastSeenGps',
  memberOpenCase: 'member.openCase',
  memberFoundHint: 'member.foundHint',

  // Wristband
  wristbandTitle: 'wristband.title',
  wristbandHint: 'wristband.hint',
  wristbandPayload: 'wristband.payload',
} as const;

export type I18nKey = (typeof I18N_KEYS)[keyof typeof I18N_KEYS];
