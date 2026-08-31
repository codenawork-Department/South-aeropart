export type ProfileLanguage = "th" | "en";

export interface ProfileTranslation {
  header: {
    customerDashboard: string;
    pageTitle: string;
    verified: string;
    activeAccount: string;
    memberSince: string;
    myGarage: string;
    car: string;
    cars: string;
    addresses: string;
    saved: string;
    valuedCustomer: string;
  };
  tabs: {
    personal: string;
    garage: string;
    addresses: string;
    privacy: string;
  };
  personalTab: {
    sectionTitle: string;
    sectionSubtitle: string;
    accountSecurity: string;
    authManagedBy: string;
    name: string;
    email: string;
    emailNotice: string;
    phone: string;
    phonePlaceholder: string;
    language: string;
    currency: string;
    currencyNotice: string;
    saveChanges: string;
    saving: string;
    saveSuccess: string;
  };
  garageTab: {
    title: string;
    subtitle: string;
    addVehicle: string;
    emptyTitle: string;
    emptyDesc: string;
    addFirst: string;
    primaryCar: string;
    activeFilter: string;
    setPrimary: string;
    year: string;
    edit: string;
    delete: string;
    deleteConfirm: string;
    modalAddTitle: string;
    modalEditTitle: string;
    brandLabel: string;
    modelLabel: string;
    noModels: string;
    yearLabel: string;
    subModelLabel: string;
    setPrimaryCheckbox: string;
    fitmentNotice: string;
    cancel: string;
    saveCar: string;
    savingCar: string;
    validationError: string;
  };
  addressTab: {
    title: string;
    subtitle: string;
    addShipping: string;
    addBilling: string;
    shippingTitle: string;
    billingTitle: string;
    shippingEmpty: string;
    billingEmpty: string;
    defaultBadge: string;
    setDefault: string;
    taxId: string;
    branch: string;
    tel: string;
    edit: string;
    delete: string;
    deleteConfirm: string;
    modalAddShipping: string;
    modalEditShipping: string;
    modalAddBilling: string;
    modalEditBilling: string;
    recipientName: string;
    phoneLabel: string;
    countryLabel: string;
    line1Label: string;
    line2Label: string;
    subDistrictLabel: string;
    districtLabel: string;
    provinceLabel: string;
    cityLabel: string;
    stateLabel: string;
    postalCodeLabel: string;
    companyNameLabel: string;
    taxIdLabel: string;
    branchLabel: string;
    setDefaultAddressCheckbox: string;
    cancel: string;
    saveAddress: string;
    savingAddress: string;
  };
  privacyTab: {
    title: string;
    lawBadge: string;
    subtitle: string;
    viewTermsBtn: string;
    dataMatrixTitle: string;
    viewFullMatrix: string;
    category1Title: string;
    category1Desc: string;
    category2Title: string;
    category2Desc: string;
    category3Title: string;
    category3Desc: string;
    category4Title: string;
    category4Desc: string;
    category5Title: string;
    category5Desc: string;
    category6Title: string;
    category6Desc: string;
    consentsTitle: string;
    consentEmail: string;
    consentEmailDesc: string;
    consentSms: string;
    consentSmsDesc: string;
    consentAnalytics: string;
    consentAnalyticsDesc: string;
    saveConsents: string;
    savingConsents: string;
    consentsUpdated: string;
    exportTitle: string;
    exportDesc: string;
    exportBtn: string;
    exportingBtn: string;
    authNoticeTitle: string;
    authNoticeDesc: string;
  };
}

export const PROFILE_TRANSLATIONS: Record<ProfileLanguage, ProfileTranslation> = {
  th: {
    header: {
      customerDashboard: "แดชบอร์ดลูกค้า",
      pageTitle: "บัญชีและโปรไฟล์ของฉัน",
      verified: "ยืนยันแล้ว",
      activeAccount: "บัญชีเปิดใช้งานปกติ",
      memberSince: "สมาชิกตั้งแต่ปี",
      myGarage: "โรงรถของฉัน",
      car: "คัน",
      cars: "คัน",
      addresses: "สมุดที่อยู่",
      saved: "บันทึกแล้ว",
      valuedCustomer: "ลูกค้าคนสำคัญ",
    },
    tabs: {
      personal: "ข้อมูลส่วนตัว",
      garage: "โรงรถของฉัน",
      addresses: "สมุดที่อยู่และภาษี",
      privacy: "ความเป็นส่วนตัวและ PDPA",
    },
    personalTab: {
      sectionTitle: "ข้อมูลโปรไฟล์และการตั้งค่า",
      sectionSubtitle: "จัดการชื่อ ที่อยู่ติดต่อ ภาษา และสกุลเงินในการแสดงผล",
      accountSecurity: "ระบบความปลอดภัยบัญชี",
      authManagedBy: "เข้าสู่ระบบอย่างปลอดภัยผ่าน Google OAuth / Clerk",
      name: "ชื่อ-นามสกุล",
      email: "อีเมลที่ลงทะเบียน",
      emailNotice: "* จัดการและยืนยันผ่านระบบ Clerk OAuth",
      phone: "หมายเลขโทรศัพท์",
      phonePlaceholder: "เช่น 081-234-5678",
      language: "ภาษาแสดงผล (Display Language)",
      currency: "สกุลเงินแสดงผล (Display Currency)",
      currencyNotice: "* แสดงราคาแปลงค่าเพื่อการอ้างอิง ระบบจะคิดเงินตามสกุลเงินหลักของร้านค้า",
      saveChanges: "บันทึกการเปลี่ยนแปลง",
      saving: "กำลังบันทึก...",
      saveSuccess: "อัปเดตข้อมูลโปรไฟล์เรียบร้อยแล้ว!",
    },
    garageTab: {
      title: "โรงรถของฉัน (My Garage)",
      subtitle: "บันทึกรุ่นรถยนต์ของคุณเพื่อตรวจสอบความเข้ากันได้ของชิ้นส่วน Aeropart (Fitment Check)",
      addVehicle: "เพิ่มรถยนต์",
      emptyTitle: "โรงรถของคุณยังว่างอยู่",
      emptyDesc: "เพิ่มยี่ห้อ รุ่น และปีรถของคุณ เพื่อให้มั่นใจว่าชิ้นงานคาร์บอนไฟเบอร์ทุกชิ้นตรงกับตัวถังรถของคุณ 100%",
      addFirst: "เพิ่มรถคันแรก",
      primaryCar: "รถคันหลัก",
      activeFilter: "เปิดใช้ฟิลเตอร์พาร์ทตรงรุ่น",
      setPrimary: "ตั้งเป็นรถคันหลัก",
      year: "ปี",
      edit: "แก้ไข",
      delete: "ลบ",
      deleteConfirm: "ต้องการลบรถคันนี้ออกจากโรงรถของคุณใช่หรือไม่?",
      modalAddTitle: "เพิ่มรถยนต์ในโรงรถ",
      modalEditTitle: "แก้ไขข้อมูลรถยนต์",
      brandLabel: "ยี่ห้อรถยนต์ (Car Brand) *",
      modelLabel: "รุ่นรถ / ตัวถัง (Model / Chassis) *",
      noModels: "ไม่พบรุ่นรถสำหรับยี่ห้อที่เลือก",
      yearLabel: "ปี ค.ศ. (Model Year)",
      subModelLabel: "รุ่นย่อย / ตัวถังย่อย (Sub-model / Trim)",
      setPrimaryCheckbox: "ตั้งเป็นรถคันหลักสำหรับเช็กพาร์ทตรงรุ่น",
      fitmentNotice: "การบันทึกรถยนต์ช่วยให้ระบบตรวจสอบความเข้ากันได้ของชิ้นงาน (Fitment Verification) และกรองพาร์ทที่ตรงกับตัวถังของคุณโดยอัตโนมัติ",
      cancel: "ยกเลิก",
      saveCar: "บันทึกรถยนต์",
      savingCar: "กำลังบันทึก...",
      validationError: "กรุณาเลือกยี่ห้อและรุ่นรถยนต์ให้ครบถ้วน",
    },
    addressTab: {
      title: "สมุดที่อยู่และข้อมูลภาษี",
      subtitle: "จัดการที่อยู่จัดส่งสินค้าและข้อมูลสำหรับออกใบกำกับภาษีเต็มรูปแบบ",
      addShipping: "เพิ่มที่อยู่จัดส่ง",
      addBilling: "เพิ่มข้อมูลออกใบกำกับภาษี",
      shippingTitle: "ที่อยู่จัดส่งสินค้า (Shipping Destinations)",
      billingTitle: "ข้อมูลใบกำกับภาษีและใบเสร็จ (Tax & Billing Profiles)",
      shippingEmpty: "ยังไม่มีที่อยู่จัดส่งที่บันทึกไว้",
      billingEmpty: "ยังไม่มีข้อมูลสำหรับออกใบกำกับภาษี",
      defaultBadge: "ที่อยู่หลัก",
      setDefault: "ตั้งเป็นค่าเริ่มต้น",
      taxId: "เลขประจำตัวผู้เสียภาษี",
      branch: "สาขา",
      tel: "โทร",
      edit: "แก้ไข",
      delete: "ลบ",
      deleteConfirm: "ต้องการลบที่อยู่นี้ใช่หรือไม่?",
      modalAddShipping: "เพิ่มที่อยู่จัดส่งสินค้า",
      modalEditShipping: "แก้ไขที่อยู่จัดส่งสินค้า",
      modalAddBilling: "เพิ่มข้อมูลใบกำกับภาษี / ใบเสร็จ",
      modalEditBilling: "แก้ไขข้อมูลใบกำกับภาษี / ใบเสร็จ",
      recipientName: "ชื่อผู้รับ / นิติบุคคล *",
      phoneLabel: "เบอร์โทรศัพท์ติดต่อ *",
      countryLabel: "ประเทศ (Country) *",
      line1Label: "ที่อยู่ บรรทัดที่ 1 (บ้านเลขที่, อาคาร, ถนน) *",
      line2Label: "ที่อยู่ บรรทัดที่ 2 (ชั้น, ห้อง, ซอย - ตัวเลือก)",
      subDistrictLabel: "ตำบล / แขวง",
      districtLabel: "อำเภอ / เขต",
      provinceLabel: "จังหวัด",
      cityLabel: "เมือง (City)",
      stateLabel: "รัฐ / ภูมิภาค (State/Province)",
      postalCodeLabel: "รหัสไปรษณีย์ *",
      companyNameLabel: "ชื่อบริษัท / ร้านค้า (Company Name)",
      taxIdLabel: "เลขประจำตัวผู้เสียภาษี 13 หลัก (Tax ID / VAT Number)",
      branchLabel: "สาขา (เช่น สำนักงานใหญ่ หรือ 00000)",
      setDefaultAddressCheckbox: "ตั้งเป็นที่อยู่เริ่มต้นสำหรับการสั่งซื้อ",
      cancel: "ยกเลิก",
      saveAddress: "บันทึกที่อยู่",
      savingAddress: "กำลังบันทึก...",
    },
    privacyTab: {
      title: "ความเป็นส่วนตัวและการคุ้มครองข้อมูลส่วนบุคคล (PDPA)",
      lawBadge: "พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (Thailand PDPA)",
      subtitle: "เราปฏิบัติตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) อย่างเคร่งครัด พร้อมการรักษาความปลอดภัยระดับมาตรฐานสากล",
      viewTermsBtn: "ดูข้อตกลงและนโยบายความเป็นส่วนตัว (View Terms & Policy)",
      dataMatrixTitle: "ข้อมูลที่เว็บไซต์ South Aero Parts จัดเก็บตามมาตรฐาน PDPA",
      viewFullMatrix: "ดูตารางฉบับเต็ม",
      category1Title: "1. บัญชีและการเข้าสู่ระบบ",
      category1Desc: "ชื่อ, อีเมล, รูปโปรไฟล์ (Google/Clerk OAuth), IP Address & Login Log",
      category2Title: "2. ข้อมูลโรงรถ (Garage)",
      category2Desc: "ยี่ห้อ, รุ่น, ปี ค.ศ., รุ่นย่อย (ไม่เก็บป้ายทะเบียนและตำแหน่งพวงมาลัย)",
      category3Title: "3. ข้อมูลจัดส่งและภาษี",
      category3Desc: "ชื่อผู้รับ, ที่อยู่จัดส่ง, เบอร์ติดต่อ, เลขผู้เสียภาษี (Tax ID / VAT)",
      category4Title: "4. คำสั่งซื้อและการชำระเงิน",
      category4Desc: "Order History, Omise Token (ไม่เก็บเลขบัตรเครดิตแบบ Plaintext)",
      category5Title: "5. คุกกี้และการวิเคราะห์",
      category5Desc: "Essential Session Cookies, Cart State, Fitment Analytics",
      category6Title: "6. สิทธิเจ้าของข้อมูล (DSR)",
      category6Desc: "สิทธิเข้าถึง, แก้ไข, ขอสำเนา (Data Export JSON), และขอเพิกถอน",
      consentsTitle: "การจัดการความยินยอมทางการตลาด (Consent Management)",
      consentEmail: "ข่าวสารเปิดตัวชุดแต่งและสินค้าใหม่ (Email Newsletter)",
      consentEmailDesc: "รับสิทธิ์สั่งจองชุดแต่งคาร์บอนไฟเบอร์รอบพิเศษและส่วนลดโปรโมชันก่อนใคร",
      consentSms: "การแจ้งเตือน Flash Sale และสินค้าจำนวนจำกัด (SMS)",
      consentSmsDesc: "รับ SMS แจ้งเตือนสินค้าสั่งผลิตจำนวนจำกัดและสถานะการจัดส่งด่วน",
      consentAnalytics: "การวิเคราะห์พฤติกรรมเพื่อแนะนำพาร์ทตรงรุ่นเฉพาะบุคคล",
      consentAnalyticsDesc: "อนุญาตให้ระบบวิเคราะห์ประวัติและรถในโรงรถเพื่อแนะนำชิ้นงานที่ตรงสเปก",
      saveConsents: "บันทึกการตั้งค่าความเป็นส่วนตัว",
      savingConsents: "กำลังบันทึก...",
      consentsUpdated: "อัปเดตการยินยอมตามมาตรฐาน PDPA เรียบร้อยแล้ว!",
      exportTitle: "ดาวน์โหลดสำเนาข้อมูลส่วนบุคคล (Right to Data Portability)",
      exportDesc: "ดาวน์โหลดไฟล์ JSON บันทึกข้อมูลส่วนตัว ประวัติรถยนต์ในโรงรถ ที่อยู่จัดส่ง และประวัติความยินยอมทั้งหมดตามสิทธิ PDPA",
      exportBtn: "ดาวน์โหลดข้อมูล (JSON)",
      exportingBtn: "กำลังสร้าง JSON...",
      authNoticeTitle: "ความปลอดภัยของบัญชีและการชำระเงิน",
      authNoticeDesc: "ข้อมูลบัญชีถูกเข้ารหัสผ่าน Clerk Authentication และการชำระเงินดำเนินการผ่าน Omise (PCI-DSS Level 1) โดยไม่มีการเก็บข้อมูลบัตรเครดิตแบบ Plaintext บนเซิร์ฟเวอร์",
    },
  },

  en: {
    header: {
      customerDashboard: "Customer Dashboard",
      pageTitle: "My Account & Profile",
      verified: "Verified",
      activeAccount: "Active Customer Account",
      memberSince: "Member since",
      myGarage: "My Garage",
      car: "Car",
      cars: "Cars",
      addresses: "Addresses",
      saved: "Saved",
      valuedCustomer: "Valued Customer",
    },
    tabs: {
      personal: "Personal Info",
      garage: "My Garage",
      addresses: "Addresses & Tax",
      privacy: "Privacy & GDPR",
    },
    personalTab: {
      sectionTitle: "Profile Preferences & Account",
      sectionSubtitle: "Manage your display name, contact phone, display language, and currency.",
      accountSecurity: "Account Security",
      authManagedBy: "Secure authentication managed via Google OAuth / Clerk",
      name: "Full Name",
      email: "Registered Email Address",
      emailNotice: "* Managed and verified via Clerk OAuth",
      phone: "Contact Phone Number",
      phonePlaceholder: "e.g. +1 (555) 019-2834",
      language: "Display Language",
      currency: "Display Currency",
      currencyNotice: "* Display conversion for reference. Checkout is processed in store primary currency.",
      saveChanges: "Save Changes",
      saving: "Saving Preferences...",
      saveSuccess: "Profile preferences updated successfully!",
    },
    garageTab: {
      title: "My Garage",
      subtitle: "Save your vehicle models to check aeropart compatibility and receive fitment alerts.",
      addVehicle: "Add Vehicle",
      emptyTitle: "Your Garage is Empty",
      emptyDesc: "Add your car brand, model, and year to ensure every aerodynamic carbon fiber part matches your chassis 100%.",
      addFirst: "Add First Vehicle",
      primaryCar: "Primary Car",
      activeFilter: "Active Fitment Filter",
      setPrimary: "Set as Primary",
      year: "Year",
      edit: "Edit",
      delete: "Delete",
      deleteConfirm: "Remove this vehicle from your garage?",
      modalAddTitle: "Add Car to My Garage",
      modalEditTitle: "Edit Vehicle",
      brandLabel: "Car Brand *",
      modelLabel: "Model / Chassis *",
      noModels: "No models available for selected brand",
      yearLabel: "Model Year",
      subModelLabel: "Sub-model / Trim",
      setPrimaryCheckbox: "Set as my primary vehicle for automatic fitment check",
      fitmentNotice: "Adding your car helps South Aeropart verify exact part fitment and filter aerodynamic kits engineered for your chassis.",
      cancel: "Cancel",
      saveCar: "Save Car",
      savingCar: "Saving...",
      validationError: "Please select both a car brand and model.",
    },
    addressTab: {
      title: "Address Book & Invoicing",
      subtitle: "Manage your delivery destinations and corporate tax invoice details.",
      addShipping: "Add Shipping Address",
      addBilling: "Add Tax / Billing Info",
      shippingTitle: "Shipping Destinations",
      billingTitle: "Tax & Billing Profiles",
      shippingEmpty: "No saved shipping addresses yet",
      billingEmpty: "No saved tax/billing profiles yet",
      defaultBadge: "Default",
      setDefault: "Set as Default",
      taxId: "Tax ID / VAT",
      branch: "Branch",
      tel: "Tel",
      edit: "Edit",
      delete: "Delete",
      deleteConfirm: "Remove this address from your account?",
      modalAddShipping: "Add Shipping Address",
      modalEditShipping: "Edit Shipping Address",
      modalAddBilling: "Add Tax / Billing Profile",
      modalEditBilling: "Edit Tax / Billing Profile",
      recipientName: "Recipient Name / Entity *",
      phoneLabel: "Phone Number *",
      countryLabel: "Country *",
      line1Label: "Address Line 1 (Street, House No., Building) *",
      line2Label: "Address Line 2 (Apartment, Suite, Unit - Optional)",
      subDistrictLabel: "Sub-District",
      districtLabel: "District",
      provinceLabel: "Province / State",
      cityLabel: "City *",
      stateLabel: "State / Region",
      postalCodeLabel: "Postal / ZIP Code *",
      companyNameLabel: "Company Name (For Commercial Invoicing)",
      taxIdLabel: "Tax ID / VAT Number",
      branchLabel: "Branch Code (e.g. Head Office or 00000)",
      setDefaultAddressCheckbox: "Set as default address for future orders",
      cancel: "Cancel",
      saveAddress: "Save Address",
      savingAddress: "Saving...",
    },
    privacyTab: {
      title: "Privacy & Data Protection (GDPR & Global Standards)",
      lawBadge: "General Data Protection Regulation (EU GDPR) & International Privacy Framework",
      subtitle: "We strictly adhere to global privacy regulations, EU GDPR, and localized consumer data protection laws.",
      viewTermsBtn: "View Legal Terms & Privacy Policy",
      dataMatrixTitle: "Personal Data Processed by South Aero Parts",
      viewFullMatrix: "View Full Data Matrix",
      category1Title: "1. Account & Identity Data",
      category1Desc: "Full Name, Email, Avatar URL (Clerk/Google OAuth), IP & Session Audit Logs",
      category2Title: "2. Garage Vehicle Data",
      category2Desc: "Make, Model, Year, Trim (License plates & steering positions are not collected)",
      category3Title: "3. Shipping & Invoicing Data",
      category3Desc: "Recipient Name, Delivery Address, Contact Phone, Corporate VAT/Tax ID",
      category4Title: "4. Orders & Payment Data",
      category4Desc: "Order History, Omise Tokenized Charges (No plaintext card data stored)",
      category5Title: "5. Cookies & Fitment Analytics",
      category5Desc: "Essential Session Cookies, Cart State, Chassis Fitment Analytics",
      category6Title: "6. Data Subject Rights (DSR)",
      category6Desc: "Right to Access, Rectify, Data Portability (JSON Export), and Withdraw Consent",
      consentsTitle: "Marketing & Communication Consents",
      consentEmail: "Aero Kit Releases & Product Newsletters (Email)",
      consentEmailDesc: "Receive early-bird access to limited dry carbon drops, aero pre-orders, and seasonal discounts.",
      consentSms: "SMS Notifications & Flash Drop Alerts",
      consentSmsDesc: "Receive high-priority SMS alerts for limited production batches and dispatch tracking.",
      consentAnalytics: "Personalized Aero Fitment Analytics",
      consentAnalyticsDesc: "Allow South Aeropart to analyze browsing preferences and garage cars to tailor aero suggestions.",
      saveConsents: "Save Privacy Preferences",
      savingConsents: "Saving Preferences...",
      consentsUpdated: "Privacy preferences updated in accordance with GDPR standards!",
      exportTitle: "Download Personal Data Archive (Right to Data Portability)",
      exportDesc: "Download an exported JSON copy of all personal details, saved garage vehicles, addresses, and consent audit trails.",
      exportBtn: "Export Data (JSON)",
      exportingBtn: "Generating JSON...",
      authNoticeTitle: "Authentication & Payment Security",
      authNoticeDesc: "Credentials are encrypted via Clerk Authentication. Payments are processed securely via Omise (PCI-DSS Level 1) with no plaintext card numbers stored on our servers.",
    },
  },
};
