"use client";

import { useState } from "react";
import {
  X,
  Shield,
  FileText,
  Lock,
  Database,
  Car,
  CreditCard,
  Truck,
  CheckCircle2,
  Mail,
  ScrollText,
} from "lucide-react";
import { ProfileLanguage } from "./profile-i18n";

interface PdpaTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: ProfileLanguage;
}

export function PdpaTermsModal({ isOpen, onClose, language = "en" }: PdpaTermsModalProps) {
  const [activeTab, setActiveTab] = useState<"privacy" | "data_matrix" | "terms">("privacy");
  const [modalLanguage, setModalLanguage] = useState<ProfileLanguage>(language);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl bg-[#121212] border border-[#2A2A2A] rounded-xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222222] bg-[#181818]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-[var(--accent-red)]/10 text-[var(--accent-red)] border border-[var(--accent-red)]/20">
              <Shield size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-heading uppercase text-white tracking-wide">
                {modalLanguage === "th"
                  ? "ข้อตกลงการใช้บริการและนโยบายความเป็นส่วนตัว (PDPA)"
                  : "Terms of Service & Privacy Policy (GDPR / Global)"}
              </h2>
              <p className="text-[0.7rem] text-[var(--text-muted)]">
                {modalLanguage === "th"
                  ? "South Aero Parts • พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562"
                  : "South Aero Parts • General Data Protection Regulation (GDPR) & Global Privacy Framework"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Switcher in Modal */}
            <div className="flex items-center bg-[#1F1F1F] border border-[#333333] rounded p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setModalLanguage("th")}
                className={`px-2.5 py-1 rounded transition-all font-semibold ${
                  modalLanguage === "th"
                    ? "bg-[var(--accent-red)] text-white"
                    : "text-[var(--text-muted)] hover:text-white"
                }`}
              >
                ไทย (TH)
              </button>
              <button
                type="button"
                onClick={() => setModalLanguage("en")}
                className={`px-2.5 py-1 rounded transition-all font-semibold ${
                  modalLanguage === "en"
                    ? "bg-[var(--accent-red)] text-white"
                    : "text-[var(--text-muted)] hover:text-white"
                }`}
              >
                EN
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded text-[var(--text-muted)] hover:text-white hover:bg-white/5 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-[#222222] bg-[#141414] px-6 gap-2 sm:gap-4 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab("privacy")}
            className={`py-3 px-3 font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "privacy"
                ? "border-[var(--accent-red)] text-white bg-[var(--accent-red)]/5"
                : "border-transparent text-[var(--text-secondary)] hover:text-white"
            }`}
          >
            <Shield size={14} className={activeTab === "privacy" ? "text-[var(--accent-red)]" : ""} />
            {modalLanguage === "th"
              ? "1. นโยบายคุ้มครองข้อมูลส่วนบุคคล (Privacy Policy)"
              : "1. Privacy Policy & Legal Bases (GDPR)"}
          </button>

          <button
            onClick={() => setActiveTab("data_matrix")}
            className={`py-3 px-3 font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "data_matrix"
                ? "border-[var(--accent-red)] text-white bg-[var(--accent-red)]/5"
                : "border-transparent text-[var(--text-secondary)] hover:text-white"
            }`}
          >
            <Database size={14} className={activeTab === "data_matrix" ? "text-[var(--accent-red)]" : ""} />
            {modalLanguage === "th"
              ? "2. ตารางข้อมูลที่จัดเก็บ (Data Matrix)"
              : "2. Data Processing Inventory Matrix"}
          </button>

          <button
            onClick={() => setActiveTab("terms")}
            className={`py-3 px-3 font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "terms"
                ? "border-[var(--accent-red)] text-white bg-[var(--accent-red)]/5"
                : "border-transparent text-[var(--text-secondary)] hover:text-white"
            }`}
          >
            <ScrollText size={14} className={activeTab === "terms" ? "text-[var(--accent-red)]" : ""} />
            {modalLanguage === "th"
              ? "3. ข้อกำหนดและเงื่อนไขการใช้บริการ (Terms of Service)"
              : "3. Terms & Conditions of Service"}
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-6 space-y-6 text-sm text-[var(--text-secondary)] leading-relaxed">
          {/* =========================================================================
              TAB 1: PRIVACY POLICY (TH / EN)
             ========================================================================= */}
          {activeTab === "privacy" && (
            <div className="space-y-6 animate-fade-in">
              {/* THAI PDPA */}
              {modalLanguage === "th" && (
                <>
                  <div className="p-4 bg-[var(--accent-red)]/5 border border-[var(--accent-red)]/20 rounded-lg">
                    <h3 className="text-white font-bold text-sm mb-1 flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-[var(--accent-red)]" />
                      คำชี้แจงสิทธิและการคุ้มครองข้อมูลส่วนบุคคลตาม พ.ร.บ. PDPA พ.ศ. 2562
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)]">
                      บริษัท เซาท์ แอโร พาร์ท จำกัด (&quot;South Aero Parts&quot;) ตระหนักถึงความสำคัญของการคุ้มครองข้อมูลส่วนบุคคลของท่านตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) จึงได้จัดทำนโยบายนี้เพื่อแจ้งให้ท่านทราบถึงรายละเอียดเกี่ยวกับการเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคล
                    </p>
                  </div>

                  <section className="space-y-2">
                    <h4 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                      <Database size={15} className="text-[var(--accent-red)]" />
                      1. วัตถุประสงค์ในการเก็บรวบรวมและการประมวลผลข้อมูล
                    </h4>
                    <ul className="list-disc list-inside space-y-1.5 text-xs text-[var(--text-secondary)] pl-2">
                      <li>
                        <strong className="text-white">การตรวจสอบความเข้ากันได้ของชิ้นส่วน (Fitment Verification):</strong> ข้อมูลรถยนต์ในโรงรถ (ยี่ห้อ, รุ่น, ปี, รุ่นย่อย) ใช้สำหรับคำนวณและกรองชิ้นส่วน Aeroparts ที่ตรงกับตัวถังรถยนต์ของท่านอย่างแม่นยำ (ไม่มีการเก็บป้ายทะเบียนและตำแหน่งพวงมาลัย)
                      </li>
                      <li>
                        <strong className="text-white">การจัดส่งสินค้าและบริการ (Order Fulfillment & Delivery):</strong> ชื่อ, หมายเลขโทรศัพท์ และที่อยู่จัดส่ง ใช้เพื่อการประสานงานจัดส่งสินค้าผ่านขนส่งเอกชน
                      </li>
                      <li>
                        <strong className="text-white">การออกเอกสารทางการเงินและภาษี (Invoicing & Tax Compliance):</strong> ข้อมูลใบกำกับภาษี (ชื่อนิติบุคคล, เลขประจำตัวผู้เสียภาษี, สาขา) ใช้สำหรับออกใบเสร็จรับเงิน/ใบกำกับภาษีตามประมวลรัษฎากร
                      </li>
                      <li>
                        <strong className="text-white">ความมั่นคงปลอดภัยและการตรวจสอบ (Security & Audit Trail):</strong> บันทึกประวัติการเข้าสู่ระบบ (Login Logs, IP Address, Device User-Agent) เพื่อป้องกันการเข้าถึงโดยมิชอบและการฉ้อโกง
                      </li>
                      <li>
                        <strong className="text-white">การตลาดและข่าวสารโปรโมชัน (Optional Marketing):</strong> ส่งข่าวสารเปิดตัวชุดแต่งรุ่นใหม่และโค้ดส่วนลด *เฉพาะกรณีที่ผู้ใช้งานให้ความยินยอม (Opt-in) เท่านั้น*
                      </li>
                    </ul>
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                      <Lock size={15} className="text-[var(--accent-red)]" />
                      2. ผู้ให้บริการภายนอกที่ร่วมประมวลผลข้อมูล (Third-Party Sub-processors)
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)]">
                      South Aero Parts จะไม่มีการนำข้อมูลส่วนบุคคลของท่านไปจำหน่าย จ่าย แจก ให้แก่บุคคลภายนอก เว้นแต่เป็นผู้ให้บริการที่จำเป็นต่อระบบ:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="p-3 bg-[#181818] border border-[#282828] rounded-md text-xs">
                        <p className="font-bold text-white">Clerk Inc. (USA)</p>
                        <p className="text-[var(--text-muted)] mt-0.5">ระบบยืนยันตัวตน (Google OAuth / Email Auth) มาตรฐาน SOC-2 Type II</p>
                      </div>
                      <div className="p-3 bg-[#181818] border border-[#282828] rounded-md text-xs">
                        <p className="font-bold text-white">Omise Co., Ltd. (Thailand / Global)</p>
                        <p className="text-[var(--text-muted)] mt-0.5">Payment Gateway มาตรฐาน PCI-DSS Level 1 (ระบบไม่เก็บเลขบัตรเครดิต)</p>
                      </div>
                      <div className="p-3 bg-[#181818] border border-[#282828] rounded-md text-xs">
                        <p className="font-bold text-white">Cloudinary Ltd.</p>
                        <p className="text-[var(--text-muted)] mt-0.5">ระบบจัดเก็บรูปภาพและสลิปหลักฐานการชำระเงินที่ผ่านการเข้ารหัส</p>
                      </div>
                      <div className="p-3 bg-[#181818] border border-[#282828] rounded-md text-xs">
                        <p className="font-bold text-white">ขนส่งเอกชน (Flash, Kerry, Thailand Post)</p>
                        <p className="text-[var(--text-muted)] mt-0.5">ส่งต่อเฉพาะชื่อ, เบอร์โทรศัพท์ และที่อยู่จัดส่งสำหรับนำส่งสินค้า</p>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                      <FileText size={15} className="text-[var(--accent-red)]" />
                      3. สิทธิของท่านตามกฎหมาย PDPA (Data Subject Rights)
                    </h4>
                    <div className="space-y-1.5 text-xs text-[var(--text-secondary)] pl-2">
                      <p>• <strong className="text-white">สิทธิในการเข้าถึงและขอรับสำเนา (Right of Access):</strong> สามารถตรวจสอบข้อมูลทั้งหมดได้ในหน้า Profile ตลอดเวลา</p>
                      <p>• <strong className="text-white">สิทธิในการขอให้โอนย้ายข้อมูล (Right to Data Portability):</strong> สามารถกดปุ่ม <em>&quot;Export Data (JSON)&quot;</em> เพื่อดาวน์โหลดสำเนาข้อมูลดิจิทัลได้ทันที</p>
                      <p>• <strong className="text-white">สิทธิในการแก้ไขข้อมูล (Right to Rectification):</strong> สามารถแก้ไขข้อมูลส่วนตัว ที่อยู่ และรถยนต์ในโรงรถได้ด้วยตนเอง</p>
                      <p>• <strong className="text-white">สิทธิในการเพิกถอนความยินยอม (Right to Withdraw Consent):</strong> สามารถเปิดหรือปิด Toggle ความยินยอมทางการตลาดได้ทันที</p>
                      <p>• <strong className="text-white">สิทธิในการขอให้ลบข้อมูล (Right to Erasure):</strong> สามารถส่งคำขอขอลบบัญชีและข้อมูลส่วนบุคคลถาวรได้ทางฝ่ายสนับสนุน</p>
                    </div>
                  </section>

                  <div className="p-4 bg-[#161616] border border-[#242424] rounded-lg text-xs flex items-start gap-3">
                    <Mail size={18} className="text-[var(--accent-red)] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-white">เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล (Data Protection Officer - DPO)</p>
                      <p className="text-[var(--text-secondary)] mt-0.5">
                        อีเมล: <span className="text-white font-mono">privacy@southaeropart.com</span> | สำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล (สคส.)
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* ENGLISH GDPR & GLOBAL */}
              {modalLanguage === "en" && (
                <>
                  <div className="p-4 bg-[var(--accent-red)]/5 border border-[var(--accent-red)]/20 rounded-lg">
                    <h3 className="text-white font-bold text-sm mb-1 flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-[var(--accent-red)]" />
                      GDPR & International Privacy Framework Compliance
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)]">
                      South Aero Parts is dedicated to transparent, lawful, and secure processing of personal data in full compliance with the European Union General Data Protection Regulation (Regulation (EU) 2016/679 - GDPR) and international data protection standards.
                    </p>
                  </div>

                  <section className="space-y-2">
                    <h4 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                      <Database size={15} className="text-[var(--accent-red)]" />
                      1. Legal Bases for Processing (Article 6 GDPR)
                    </h4>
                    <ul className="list-disc list-inside space-y-1.5 text-xs text-[var(--text-secondary)] pl-2">
                      <li>
                        <strong className="text-white">Contract Performance (Art. 6(1)(b)):</strong> Processing name, address, payment confirmation, and garage chassis specs to manufacture, verify fitment, and deliver custom aerodynamic components.
                      </li>
                      <li>
                        <strong className="text-white">Legal Obligations (Art. 6(1)(c)):</strong> Retaining fiscal order records and VAT/Tax Invoicing data pursuant to international commercial accounting laws.
                      </li>
                      <li>
                        <strong className="text-white">Legitimate Interests (Art. 6(1)(f)):</strong> Maintaining login security audit trails (IP addresses, User-Agents) to prevent fraudulent transactions and cyber attacks.
                      </li>
                      <li>
                        <strong className="text-white">Consent (Art. 6(1)(a)):</strong> Sending promotional product drops, limited batch newsletters, and personalized fitment analytics (freely revocable at any time).
                      </li>
                    </ul>
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                      <Lock size={15} className="text-[var(--accent-red)]" />
                      2. Sub-processors and Cross-Border Data Transfers
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Personal data is processed exclusively through trusted, SOC-2 / ISO-27001 certified sub-processors governed by standard contractual clauses (SCCs):
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="p-3 bg-[#181818] border border-[#282828] rounded-md text-xs">
                        <p className="font-bold text-white">Clerk Inc. (OAuth Identity)</p>
                        <p className="text-[var(--text-muted)] mt-0.5">End-to-end encrypted authentication, passwordless login tokens, zero plain credentials.</p>
                      </div>
                      <div className="p-3 bg-[#181818] border border-[#282828] rounded-md text-xs">
                        <p className="font-bold text-white">Omise Payment Gateway</p>
                        <p className="text-[var(--text-muted)] mt-0.5">PCI-DSS Level 1 tokenized payments. South Aero Parts never handles raw credit card numbers.</p>
                      </div>
                      <div className="p-3 bg-[#181818] border border-[#282828] rounded-md text-xs">
                        <p className="font-bold text-white">Cloudinary & Neon Serverless DB</p>
                        <p className="text-[var(--text-muted)] mt-0.5">Encrypted at rest (AES-256) and in transit (TLS 1.3) database and media assets.</p>
                      </div>
                      <div className="p-3 bg-[#181818] border border-[#282828] rounded-md text-xs">
                        <p className="font-bold text-white">Global Courier Carriers (DHL/FedEx/Post)</p>
                        <p className="text-[var(--text-muted)] mt-0.5">Restricted strictly to recipient name, destination address, and customs dispatch phone.</p>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                      <FileText size={15} className="text-[var(--accent-red)]" />
                      3. Your Data Subject Rights (Articles 15-22 GDPR)
                    </h4>
                    <div className="space-y-1.5 text-xs text-[var(--text-secondary)] pl-2">
                      <p>• <strong className="text-white">Right of Access (Art. 15):</strong> View complete profile and account details instantly via your customer dashboard.</p>
                      <p>• <strong className="text-white">Right to Data Portability (Art. 20):</strong> Export an interoperable JSON archive of all personal data with one click.</p>
                      <p>• <strong className="text-white">Right to Rectification (Art. 16):</strong> Modify saved vehicles, contact numbers, and addresses at any time.</p>
                      <p>• <strong className="text-white">Right to Erasure / &quot;Be Forgotten&quot; (Art. 17):</strong> Request permanent account and data deletion subject to legal fiscal retention rules.</p>
                      <p>• <strong className="text-white">Right to Withdraw Consent (Art. 7(3)):</strong> Opt-out from marketing communication at any time without affecting core service access.</p>
                    </div>
                  </section>

                  <div className="p-4 bg-[#161616] border border-[#242424] rounded-lg text-xs flex items-start gap-3">
                    <Mail size={18} className="text-[var(--accent-red)] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-white">Data Protection Officer (DPO)</p>
                      <p className="text-[var(--text-secondary)] mt-0.5">
                        Email: <span className="text-white font-mono">privacy@southaeropart.com</span> | Lead Supervisory Authority: Data Protection Commission
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* =========================================================================
              TAB 2: DATA COLLECTION MATRIX
             ========================================================================= */}
          {activeTab === "data_matrix" && (
            <div className="space-y-5 animate-fade-in">
              <p className="text-xs text-[var(--text-secondary)]">
                {modalLanguage === "th"
                  ? "ตารางแสดงรายละเอียดประเภทข้อมูลส่วนบุคคลที่เว็บไซต์ South Aero Parts จัดเก็บ ฐานทางกฎหมาย และระยะเวลาการเก็บรักษา:"
                  : "Detailed inventory of personal data categories processed by South Aero Parts, legal grounds under GDPR, and retention periods:"}
              </p>

              <div className="overflow-x-auto border border-[#242424] rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#181818] border-b border-[#282828] text-white">
                      <th className="p-3 font-bold font-heading uppercase">
                        {modalLanguage === "th" ? "หมวดหมู่ข้อมูล" : "Data Category"}
                      </th>
                      <th className="p-3 font-bold font-heading uppercase">
                        {modalLanguage === "th" ? "รายการข้อมูลที่จัดเก็บ" : "Processed Items"}
                      </th>
                      <th className="p-3 font-bold font-heading uppercase">
                        {modalLanguage === "th" ? "ฐานกฎหมาย" : "Legal Basis"}
                      </th>
                      <th className="p-3 font-bold font-heading uppercase">
                        {modalLanguage === "th" ? "ระยะเวลาจัดเก็บ" : "Retention Period"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222222]">
                    <tr className="hover:bg-white/[0.02]">
                      <td className="p-3 font-semibold text-white flex items-center gap-1.5">
                        <Lock size={14} className="text-[var(--accent-red)]" />
                        {modalLanguage === "th" ? "บัญชี & ยืนยันตัวตน" : "Identity & Account"}
                      </td>
                      <td className="p-3 text-[var(--text-secondary)]">
                        {modalLanguage === "th"
                          ? "ชื่อ-นามสกุล, อีเมล, รูปโปรไฟล์ (Avatar), Clerk ID, ภาษา, สกุลเงิน"
                          : "Full Name, Email, Avatar URL, Clerk ID, Display Language, Currency"}
                      </td>
                      <td className="p-3 text-[var(--text-muted)]">
                        {modalLanguage === "th" ? "สัญญา (Contract)" : "Contract (Art. 6(1)(b))"}
                      </td>
                      <td className="p-3 text-[var(--text-muted)]">
                        {modalLanguage === "th" ? "ตลอดระยะเวลาที่มีบัญชี" : "Duration of active account"}
                      </td>
                    </tr>

                    <tr className="hover:bg-white/[0.02]">
                      <td className="p-3 font-semibold text-white flex items-center gap-1.5">
                        <Car size={14} className="text-[var(--accent-red)]" />
                        {modalLanguage === "th" ? "ข้อมูลโรงรถ (Garage)" : "Garage Vehicles"}
                      </td>
                      <td className="p-3 text-[var(--text-secondary)]">
                        {modalLanguage === "th"
                          ? "ยี่ห้อรถยนต์, รุ่นรถยนต์/ตัวถัง, ปี ค.ศ., รุ่นย่อย (Trim)"
                          : "Car Make, Model/Chassis, Model Year, Sub-model Trim"}
                        <br />
                        <span className="text-[0.68rem] text-emerald-400 font-medium">
                          {modalLanguage === "th"
                            ? "✓ ปลอดภัย: ไม่มีการเก็บเลขทะเบียนรถและตำแหน่งพวงมาลัย"
                            : "✓ Privacy-First: License plates and steering positions are NOT stored"}
                        </span>
                      </td>
                      <td className="p-3 text-[var(--text-muted)]">
                        {modalLanguage === "th" ? "ประโยชน์โดยชอบธรรม / สัญญา" : "Legitimate Interest / Contract"}
                      </td>
                      <td className="p-3 text-[var(--text-muted)]">
                        {modalLanguage === "th" ? "จนกว่าผู้ใช้จะลบออกจากระบบ" : "Until removed by user"}
                      </td>
                    </tr>

                    <tr className="hover:bg-white/[0.02]">
                      <td className="p-3 font-semibold text-white flex items-center gap-1.5">
                        <Truck size={14} className="text-[var(--accent-red)]" />
                        {modalLanguage === "th" ? "ที่อยู่ & ภาษี" : "Addresses & Invoicing"}
                      </td>
                      <td className="p-3 text-[var(--text-secondary)]">
                        {modalLanguage === "th"
                          ? "ชื่อผู้รับ, เบอร์โทรศัพท์, ที่อยู่จัดส่ง, เลขประจำตัวผู้เสียภาษี (Tax ID), ชื่อบริษัท, สาขา"
                          : "Recipient Name, Phone Number, Delivery Address, Corporate VAT/Tax ID, Branch"}
                      </td>
                      <td className="p-3 text-[var(--text-muted)]">
                        {modalLanguage === "th" ? "สัญญา / หน้าที่ตามกฎหมายภาษี" : "Legal Obligation (Art. 6(1)(c))"}
                      </td>
                      <td className="p-3 text-[var(--text-muted)]">
                        {modalLanguage === "th" ? "5 - 7 ปี ตามกฎหมายประมวลรัษฎากร" : "5 - 7 years (Statutory Fiscal Code)"}
                      </td>
                    </tr>

                    <tr className="hover:bg-white/[0.02]">
                      <td className="p-3 font-semibold text-white flex items-center gap-1.5">
                        <CreditCard size={14} className="text-[var(--accent-red)]" />
                        {modalLanguage === "th" ? "คำสั่งซื้อ & ชำระเงิน" : "Orders & Payments"}
                      </td>
                      <td className="p-3 text-[var(--text-secondary)]">
                        {modalLanguage === "th"
                          ? "หมายเลข Order, รายการสินค้า, ยอดเงิน, Omise Charge Token, สลิปโอนเงิน"
                          : "Order Number, Line Items, Total Price, Omise Charge Token, Payment Slips"}
                        <br />
                        <span className="text-[0.68rem] text-emerald-400 font-medium">
                          {modalLanguage === "th"
                            ? "✓ ปลอดภัย: ไม่มีการจัดเก็บข้อมูลบัตรเครดิตแบบ Plaintext"
                            : "✓ PCI-DSS Level 1: No plaintext card numbers are stored"}
                        </span>
                      </td>
                      <td className="p-3 text-[var(--text-muted)]">
                        {modalLanguage === "th" ? "สัญญา (Contract)" : "Contract Performance"}
                      </td>
                      <td className="p-3 text-[var(--text-muted)]">
                        {modalLanguage === "th" ? "5 - 7 ปี ตามกฎหมายการบัญชี" : "5 - 7 years (Commercial Code)"}
                      </td>
                    </tr>

                    <tr className="hover:bg-white/[0.02]">
                      <td className="p-3 font-semibold text-white flex items-center gap-1.5">
                        <Shield size={14} className="text-[var(--accent-red)]" />
                        {modalLanguage === "th" ? "บันทึกความปลอดภัย" : "Security Audit Logs"}
                      </td>
                      <td className="p-3 text-[var(--text-secondary)]">
                        IP Address, User-Agent, Login Timestamp, Authentication Method
                      </td>
                      <td className="p-3 text-[var(--text-muted)]">
                        {modalLanguage === "th" ? "หน้าที่ตามกฎหมาย / ความปลอดภัย" : "Legitimate Interest (Security)"}
                      </td>
                      <td className="p-3 text-[var(--text-muted)]">90 days - 180 days</td>
                    </tr>

                    <tr className="hover:bg-white/[0.02]">
                      <td className="p-3 font-semibold text-white flex items-center gap-1.5">
                        <Mail size={14} className="text-[var(--accent-red)]" />
                        {modalLanguage === "th" ? "การตลาด & แจ้งเตือน" : "Marketing & Analytics"}
                      </td>
                      <td className="p-3 text-[var(--text-secondary)]">
                        Email Newsletter Opt-in, SMS Flash Promo Consent, Fitment Recommendation Analytics
                      </td>
                      <td className="p-3 text-[var(--text-muted)]">
                        {modalLanguage === "th" ? "ความยินยอม (Consent)" : "Explicit Consent (Art. 6(1)(a))"}
                      </td>
                      <td className="p-3 text-[var(--text-muted)]">
                        {modalLanguage === "th" ? "จนกว่าจะเพิกถอนความยินยอม" : "Until consent is withdrawn"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 3: TERMS OF SERVICE
             ========================================================================= */}
          {activeTab === "terms" && (
            <div className="space-y-6 animate-fade-in text-xs">
              {modalLanguage === "th" ? (
                <>
                  <section className="space-y-2">
                    <h4 className="text-white font-bold text-sm uppercase tracking-wider">
                      1. การยอมรับข้อกำหนดการใช้งาน
                    </h4>
                    <p>
                      การเข้าใช้งานเว็บไซต์ South Aero Parts ถือว่าท่านได้อ่าน ทำความเข้าใจ และตกลงที่จะผูกพันตนเองตามข้อกำหนดและเงื่อนไขการใช้บริการนี้ หากท่านไม่เห็นด้วยกับข้อกำหนดใดๆ ขอความกรุณายุติการเข้าใช้บริการแพลตฟอร์ม
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-white font-bold text-sm uppercase tracking-wider">
                      2. การสั่งซื้อและสินค้าชิ้นงาน Aerodynamics
                    </h4>
                    <p>
                      สินค้าชิ้นงานคาร์บอนไฟเบอร์ (Pre-preg / Vacuum Dry Carbon) และชุดแต่งแอโรไดนามิกส์เป็นชิ้นงานสมรรถนะสูงที่ออกแบบเฉพาะรุ่นรถยนต์ ผู้ใช้งานมีหน้าที่ตรวจสอบความถูกต้องของรุ่นรถยนต์และปี ค.ศ. ผ่านระบบ My Garage หรือสอบถามทีมงานก่อนทำการยืนยันคำสั่งซื้อ
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-white font-bold text-sm uppercase tracking-wider">
                      3. การชำระเงินและการคืนเงิน
                    </h4>
                    <p>
                      การชำระเงินผ่านระบบ PromptPay, บัตรเครดิต, หรือการโอนเงินผ่านธนาคาร จะถือว่าเสร็จสมบูรณ์เมื่อระบบ Payment Gateway (Omise) หรือทีมงานตรวจสอบสลิปยืนยันเรียบร้อยแล้ว ในกรณีสินค้าสั่งผลิตพิเศษ (Custom Made-to-Order) บริษัทขอสงวนสิทธิ์ในการยกเลิกหรือคืนเงินเมื่อเริ่มกระบวนการผลิตแล้ว
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-white font-bold text-sm uppercase tracking-wider">
                      4. ทรัพย์สินทางปัญญา
                    </h4>
                    <p>
                      เครื่องหมายการค้า โลโก้ รูปภาพชิ้นงาน 3D Model และเนื้อหาทั้งหมดบนเว็บไซต์นี้เป็นทรัพย์สินทางปัญญาของ South Aero Parts หรือผู้ให้อนุญาต ห้ามมิให้ทำซ้ำ ดัดแปลง หรือเผยแพร่โดยไม่ได้รับความยินยอมเป็นลายลักษณ์อักษร
                    </p>
                  </section>
                </>
              ) : (
                <>
                  <section className="space-y-2">
                    <h4 className="text-white font-bold text-sm uppercase tracking-wider">
                      1. Acceptance of Terms
                    </h4>
                    <p>
                      By accessing or purchasing from the South Aero Parts Platform, you acknowledge that you have read, understood, and agreed to be legally bound by these Terms and Conditions. If you do not agree, please discontinue website usage immediately.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-white font-bold text-sm uppercase tracking-wider">
                      2. Aerodynamic Components & Precision Fitment
                    </h4>
                    <p>
                      Our motorsport aerodynamic components and vacuum dry carbon fiber body kits are precision-engineered for specific chassis configurations. Customers are responsible for verifying their exact vehicle chassis, generation, and model year using the My Garage selector prior to order checkout.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-white font-bold text-sm uppercase tracking-wider">
                      3. Payments & Custom Made-to-Order Policies
                    </h4>
                    <p>
                      All digital transactions are encrypted and processed through Omise Gateway. For customized, bespoke, or pre-preg autoclave items, cancellations or refund requests cannot be honored once custom fabrication has commenced.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-white font-bold text-sm uppercase tracking-wider">
                      4. Intellectual Property & 3D Assets
                    </h4>
                    <p>
                      All trademarks, 3D interactive models, computer-aided designs (CAD), imagery, and technical documentation are the exclusive property of South Aero Parts. Unauthorized reproduction, distribution, or reverse-engineering is strictly prohibited.
                    </p>
                  </section>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#222222] bg-[#161616]">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <Shield size={14} className="text-emerald-400" />
            <span>
              {modalLanguage === "th"
                ? "คุ้มครองข้อมูลตาม พ.ร.บ. PDPA พ.ศ. 2562"
                : "Protected in accordance with EU GDPR & Global Privacy Regulations"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="btn-primary text-xs px-6 py-2"
          >
            {modalLanguage === "th" ? "รับทราบและปิดหน้าต่าง" : "Understood & Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
