"use client";

import { useState, useRef, useCallback } from "react";
import {
  Type,
  Image as ImageIcon,
  Layout,
  Square,
  Minus,
  MoveUp,
  MoveDown,
  Trash2,
  Copy,
  Upload,
  Smartphone,
  Monitor,
  Eye,
  Send,
  Save,
  Sparkles,
  Zap,
  Check,
  AlertCircle,
  Loader2,
  X,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Sliders,
  FolderOpen,
  Mail,
  HelpCircle,
  Package,
} from "lucide-react";
import { EmailCanvasBlock, EmailCanvasDesignState, NewsletterCampaign } from "@repo/db";
import { uploadCanvasImageAction } from "@/actions/newsletter.actions";

interface VisualEmailBuilderProps {
  initialCampaign?: NewsletterCampaign | null;
  onSaveDraft: (data: {
    id?: string;
    subject: string;
    title: string;
    previewText?: string;
    bannerImageUrl?: string;
    designJson: EmailCanvasDesignState;
    contentHtml: string;
  }) => Promise<{ success: boolean; error?: string; message?: string }>;
  onSendBroadcast: (data: {
    id?: string;
    subject: string;
    title: string;
    previewText?: string;
    bannerImageUrl?: string;
    designJson: EmailCanvasDesignState;
    contentHtml: string;
    testEmail?: string;
  }) => Promise<{ success: boolean; error?: string; message?: string }>;
  onClose?: () => void;
}

const DEFAULT_BLOCKS: EmailCanvasBlock[] = [
  {
    id: "header-1",
    type: "header",
    props: {
      backgroundColor: "#111111",
      paddingTop: 24,
      paddingBottom: 24,
      textAlign: "center",
    },
  },
  {
    id: "heading-1",
    type: "heading",
    content: "NEW AERO RELEASE DROPS",
    props: {
      fontFamily: "Oswald",
      fontSize: 28,
      fontWeight: "700",
      color: "#FFFFFF",
      textAlign: "center",
      paddingTop: 20,
      paddingBottom: 8,
    },
  },
  {
    id: "text-1",
    type: "text",
    content: "ผลงานการวิจัยและพัฒนาชิ้นงาน Dry Carbon Fiber รุ่นล่าสุด พร้อมผลการทดสอบค่า Downforce และ Drag Coefficient ในอุโมงค์ลมเสมือนจริง (CFD Aero Report)",
    props: {
      fontFamily: "Inter",
      fontSize: 14,
      color: "#A3A3A3",
      textAlign: "center",
      lineHeight: 1.6,
      paddingTop: 4,
      paddingBottom: 20,
    },
  },
  {
    id: "image-1",
    type: "image",
    props: {
      imageUrl: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80",
      imageAlt: "South Aero Performance Drop",
      paddingTop: 10,
      paddingBottom: 20,
      imageWidth: "100%",
    },
  },
  {
    id: "product-1",
    type: "product_card",
    props: {
      productTitle: "Honda Civic FL5 Front Aero Splitter",
      productDescription: "Pre-preg Autoclave Dry Carbon Fiber, ผลิตขึ้นรูปไร้รอยต่อ ลดแรงยกตัวด้านหน้า (Front Lift) ได้ถึง 28% ที่ความเร็ว 160 km/h",
      productImageUrl: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80",
      productBadge: "CFD TESTED • DRY CARBON",
      productSpecs: ["Chassis: FL5 / FE", "Material: 100% Carbon", "Weight: 1.45 kg"],
      productLinkUrl: "https://southaeropart.com/products",
      backgroundColor: "#171717",
      paddingTop: 16,
      paddingBottom: 16,
    },
  },
  {
    id: "button-1",
    type: "button",
    props: {
      buttonText: "EXPLORE PRODUCT RELEASE",
      buttonUrl: "https://southaeropart.com/products",
      buttonBgColor: "#DC2626",
      buttonTextColor: "#FFFFFF",
      buttonBorderRadius: 2,
      textAlign: "center",
      paddingTop: 24,
      paddingBottom: 24,
    },
  },
  {
    id: "footer-1",
    type: "footer",
    props: {
      backgroundColor: "#0C0C0C",
      paddingTop: 24,
      paddingBottom: 28,
      textAlign: "center",
    },
  },
];

const FONT_OPTIONS = [
  { label: "Oswald (Heading/Motorsport)", value: "Oswald" },
  { label: "Inter (Modern Sans)", value: "Inter" },
  { label: "Montserrat (Clean Display)", value: "Montserrat" },
  { label: "Courier New (Monospace / CFD Spec)", value: "Courier New" },
  { label: "Playfair Display (Serif Elegance)", value: "Playfair Display" },
];

const COLOR_PRESETS = [
  { label: "Aero Red", value: "#DC2626" },
  { label: "White", value: "#FFFFFF" },
  { label: "Light Gray", value: "#D4D4D4" },
  { label: "Muted Gray", value: "#A3A3A3" },
  { label: "Dark Gray", value: "#262626" },
  { label: "Carbon Black", value: "#141414" },
  { label: "Gold Accent", value: "#F59E0B" },
  { label: "Emerald Success", value: "#10B981" },
];

/**
 * Standard HTML Email Compiler
 * Compiles visual blocks into standard inline-CSS table structure compatible with all email clients.
 */
export function compileCanvasToEmailHtml(design: EmailCanvasDesignState, subject: string, previewText?: string): string {
  const blocksHtml = design.blocks
    .map((block) => {
      const p = block.props || {};

      switch (block.type) {
        case "header":
          return `
            <tr>
              <td align="center" style="background-color: ${p.backgroundColor || "#111111"}; padding: ${p.paddingTop || 24}px 24px ${p.paddingBottom || 24}px 24px; border-bottom: 2px solid #DC2626;">
                <table border="0" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center">
                      <span style="font-family: 'Oswald', Arial, sans-serif; font-size: 24px; font-weight: 900; letter-spacing: 4px; color: #FFFFFF; text-decoration: none;">
                        SOUTH <span style="color: #DC2626;">AERO</span>
                      </span>
                      <div style="font-family: 'Oswald', Arial, sans-serif; font-size: 9px; font-weight: 600; letter-spacing: 5px; color: #737373; text-transform: uppercase; margin-top: 2px;">
                        PERFORMANCE AERODYNAMICS
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          `;

        case "heading":
          return `
            <tr>
              <td align="${p.textAlign || "center"}" style="padding: ${p.paddingTop || 16}px 24px ${p.paddingBottom || 8}px 24px;">
                <h1 style="margin: 0; font-family: '${p.fontFamily || "Oswald"}', Arial, sans-serif; font-size: ${p.fontSize || 26}px; font-weight: ${p.fontWeight || "700"}; color: ${p.color || "#FFFFFF"}; line-height: 1.3; letter-spacing: 1px; text-transform: uppercase;">
                  ${block.content || ""}
                </h1>
              </td>
            </tr>
          `;

        case "text":
          return `
            <tr>
              <td align="${p.textAlign || "left"}" style="padding: ${p.paddingTop || 8}px 24px ${p.paddingBottom || 16}px 24px;">
                <p style="margin: 0; font-family: '${p.fontFamily || "Inter"}', Arial, sans-serif; font-size: ${p.fontSize || 14}px; color: ${p.color || "#A3A3A3"}; line-height: ${p.lineHeight || 1.6};">
                  ${(block.content || "").replace(/\n/g, "<br />")}
                </p>
              </td>
            </tr>
          `;

        case "image":
          return `
            <tr>
              <td align="center" style="padding: ${p.paddingTop || 12}px 24px ${p.paddingBottom || 16}px 24px;">
                ${
                  p.imageLinkUrl
                    ? `<a href="${p.imageLinkUrl}" target="_blank" style="text-decoration: none; display: block;">`
                    : ""
                }
                <img src="${p.imageUrl || "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80"}" alt="${p.imageAlt || "South Aero"}" width="552" style="width: 100%; max-width: 552px; height: auto; display: block; border-radius: 4px; border: 1px solid #262626;" />
                ${p.imageLinkUrl ? `</a>` : ""}
              </td>
            </tr>
          `;

        case "product_card":
          const specsHtml = p.productSpecs
            ? p.productSpecs
                .map(
                  (s) =>
                    `<span style="display: inline-block; background-color: #262626; color: #D4D4D4; font-family: 'Courier New', monospace; font-size: 11px; padding: 2px 8px; border-radius: 2px; margin-right: 6px; margin-bottom: 6px;">${s}</span>`
                )
                .join("")
            : "";

          return `
            <tr>
              <td style="padding: ${p.paddingTop || 16}px 24px ${p.paddingBottom || 16}px 24px;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${p.backgroundColor || "#171717"}; border: 1px solid #2E2E2E; border-radius: 4px; overflow: hidden;">
                  <tr>
                    <td width="200" valign="top" style="padding: 16px;">
                      <img src="${p.productImageUrl || "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=600&q=80"}" alt="${p.productTitle || "Product"}" width="180" style="width: 100%; max-width: 180px; height: auto; border-radius: 3px; display: block; border: 1px solid #333333;" />
                    </td>
                    <td valign="top" style="padding: 16px 16px 16px 0;">
                      ${
                        p.productBadge
                          ? `<div style="font-family: 'Oswald', Arial, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 1.5px; color: #DC2626; text-transform: uppercase; margin-bottom: 4px;">${p.productBadge}</div>`
                          : ""
                      }
                      <h3 style="margin: 0 0 6px 0; font-family: 'Oswald', Arial, sans-serif; font-size: 18px; font-weight: 700; color: #FFFFFF; text-transform: uppercase;">
                        ${p.productTitle || "Product Title"}
                      </h3>
                      <p style="margin: 0 0 10px 0; font-family: 'Inter', Arial, sans-serif; font-size: 12px; color: #A3A3A3; line-height: 1.5;">
                        ${p.productDescription || ""}
                      </p>
                      <div style="margin-bottom: 12px;">
                        ${specsHtml}
                      </div>
                      ${
                        p.productLinkUrl
                          ? `<a href="${p.productLinkUrl}" target="_blank" style="display: inline-block; background-color: #262626; color: #FFFFFF; font-family: 'Oswald', Arial, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-decoration: none; padding: 6px 14px; border-radius: 2px; border: 1px solid #404040;">VIEW PART DETAILS &rarr;</a>`
                          : ""
                      }
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          `;

        case "button":
          return `
            <tr>
              <td align="${p.textAlign || "center"}" style="padding: ${p.paddingTop || 20}px 24px ${p.paddingBottom || 20}px 24px;">
                <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 ${p.textAlign === "center" ? "auto" : p.textAlign === "right" ? "0 0 auto" : "0"};">
                  <tr>
                    <td align="center" style="background-color: ${p.buttonBgColor || "#DC2626"}; border-radius: ${p.buttonBorderRadius || 2}px;">
                      <a href="${p.buttonUrl || "https://southaeropart.com"}" target="_blank" style="display: inline-block; padding: 14px 32px; font-family: 'Oswald', Arial, sans-serif; font-size: 14px; font-weight: 700; letter-spacing: 2px; color: ${p.buttonTextColor || "#FFFFFF"}; text-decoration: none; text-transform: uppercase;">
                        ${p.buttonText || "LEARN MORE"}
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          `;

        case "divider":
          return `
            <tr>
              <td style="padding: ${p.paddingTop || 12}px 24px ${p.paddingBottom || 12}px 24px;">
                <hr style="border: none; border-top: 1px solid ${p.dividerColor || "#262626"}; margin: 0;" />
              </td>
            </tr>
          `;

        case "spacer":
          return `
            <tr>
              <td height="${p.spacerHeight || 20}" style="font-size: 0px; line-height: 0px;">&nbsp;</td>
            </tr>
          `;

        case "footer":
          return `
            <tr>
              <td align="center" style="background-color: ${p.backgroundColor || "#0C0C0C"}; padding: ${p.paddingTop || 28}px 24px ${p.paddingBottom || 32}px 24px; border-top: 1px solid #222222;">
                <p style="margin: 0 0 6px 0; font-family: 'Oswald', Arial, sans-serif; font-size: 14px; font-weight: 700; letter-spacing: 2px; color: #FFFFFF; text-transform: uppercase;">
                  SOUTH AERO PERFORMANCE
                </p>
                <p style="margin: 0 0 16px 0; font-family: 'Inter', Arial, sans-serif; font-size: 11px; color: #737373;">
                  High-Performance Aerodynamics & CFD Engineering • Thailand
                </p>
                <p style="margin: 0; font-family: 'Inter', Arial, sans-serif; font-size: 11px; color: #525252; line-height: 1.6;">
                  คุณได้รับอีเมลนี้เนื่องจากคุณได้ลงทะเบียนรับข่าวสารและการเปิดตัวสินค้าจาก South Aero<br />
                  <a href="{{UNSUBSCRIBE_URL}}" target="_blank" style="color: #737373; text-decoration: underline;">ยกเลิกการรับข่าวสาร (Unsubscribe)</a>
                </p>
              </td>
            </tr>
          `;

        default:
          return "";
      }
    })
    .join("\n");

  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${subject}</title>
  <style type="text/css">
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Oswald:wght@600;700;900&display=swap');
    body { margin: 0; padding: 0; background-color: #0A0A0A; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0A0A0A;">
  ${
    previewText
      ? `<div style="display: none; font-size: 1px; color: #0A0A0A; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">${previewText}</div>`
      : ""
  }
  <table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#0A0A0A">
    <tr>
      <td align="center" style="padding: 24px 12px 40px 12px;">
        <table border="0" cellpadding="0" cellspacing="0" width="600" class="email-container" bgcolor="${design.backgroundColor || "#121212"}" style="background-color: ${design.backgroundColor || "#121212"}; border: 1px solid #222222; border-radius: 6px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.8);">
          ${blocksHtml}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function VisualEmailBuilder({
  initialCampaign,
  onSaveDraft,
  onSendBroadcast,
  onClose,
}: VisualEmailBuilderProps) {
  // Campaign Metadata state
  const [campaignId] = useState<string | undefined>(initialCampaign?.id);
  const [subject, setSubject] = useState(initialCampaign?.subject || "SOUTH AERO // New Release Drop & CFD aero report");
  const [title, setTitle] = useState(initialCampaign?.title || "August Part Release Drop");
  const [previewText, setPreviewText] = useState(initialCampaign?.previewText || "สำรวจชิ้นส่วนแอโรไดนามิกส์ใหม่ล่าสุดและผลทดสอบอุโมงค์ลม");

  // Visual Design state
  const [design, setDesign] = useState<EmailCanvasDesignState>(
    initialCampaign?.designJson || {
      version: "1.0",
      backgroundColor: "#121212",
      containerWidth: 600,
      blocks: DEFAULT_BLOCKS,
    }
  );

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [isLivePreviewModalOpen, setIsLivePreviewModalOpen] = useState(false);
  const [isTestEmailModalOpen, setIsTestEmailModalOpen] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState("admin@southaero.com");

  // Loading & Toast states
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const selectedBlock = design.blocks.find((b) => b.id === selectedBlockId) || null;

  // Update block content or props
  const updateBlock = useCallback((id: string, updater: (block: EmailCanvasBlock) => EmailCanvasBlock) => {
    setDesign((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === id ? updater(b) : b)),
    }));
  }, []);

  // Move block up or down
  const moveBlock = (index: number, direction: "up" | "down") => {
    setDesign((prev) => {
      const newBlocks = [...prev.blocks];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newBlocks.length) return prev;
      const temp = newBlocks[index];
      newBlocks[index] = newBlocks[targetIndex];
      newBlocks[targetIndex] = temp;
      return { ...prev, blocks: newBlocks };
    });
  };

  // Duplicate block
  const duplicateBlock = (index: number) => {
    setDesign((prev) => {
      const newBlocks = [...prev.blocks];
      const source = newBlocks[index];
      const duplicated: EmailCanvasBlock = {
        ...source,
        id: `block-${Date.now()}`,
        props: { ...source.props },
      };
      newBlocks.splice(index + 1, 0, duplicated);
      return { ...prev, blocks: newBlocks };
    });
    showToast("คัดลอกบล็อกสำเร็จ");
  };

  // Delete block
  const deleteBlock = (id: string) => {
    setDesign((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((b) => b.id !== id),
    }));
    if (selectedBlockId === id) setSelectedBlockId(null);
    showToast("ลบบล็อกเรียบร้อย");
  };

  // Add new block
  const addBlock = (type: EmailCanvasBlock["type"]) => {
    const newId = `${type}-${Date.now()}`;
    let newBlock: EmailCanvasBlock;

    switch (type) {
      case "heading":
        newBlock = {
          id: newId,
          type: "heading",
          content: "AERODYNAMICS HEADLINE",
          props: { fontFamily: "Oswald", fontSize: 24, fontWeight: "700", color: "#FFFFFF", textAlign: "center" },
        };
        break;
      case "text":
        newBlock = {
          id: newId,
          type: "text",
          content: "กรอกเนื้อหาข่าวสาร รายละเอียดชิ้นส่วน หรือประกาศความเคลื่อนไหวล่าสุดของคุณที่นี่...",
          props: { fontFamily: "Inter", fontSize: 14, color: "#A3A3A3", textAlign: "left", lineHeight: 1.6 },
        };
        break;
      case "image":
        newBlock = {
          id: newId,
          type: "image",
          props: {
            imageUrl: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80",
            imageAlt: "South Aero Image",
            imageWidth: "100%",
          },
        };
        break;
      case "product_card":
        newBlock = {
          id: newId,
          type: "product_card",
          props: {
            productTitle: "New Aerodynamics Part",
            productDescription: "Dry carbon fiber construction with computational fluid dynamics optimization.",
            productImageUrl: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=600&q=80",
            productBadge: "NEW RELEASE",
            productSpecs: ["Material: Dry Carbon", "Fitment: Direct Bolt-on"],
            productLinkUrl: "https://southaeropart.com/products",
            backgroundColor: "#171717",
          },
        };
        break;
      case "button":
        newBlock = {
          id: newId,
          type: "button",
          props: {
            buttonText: "VIEW RELEASE DETAILS",
            buttonUrl: "https://southaeropart.com",
            buttonBgColor: "#DC2626",
            buttonTextColor: "#FFFFFF",
            buttonBorderRadius: 2,
            textAlign: "center",
          },
        };
        break;
      case "divider":
        newBlock = {
          id: newId,
          type: "divider",
          props: { dividerColor: "#262626", paddingTop: 12, paddingBottom: 12 },
        };
        break;
      case "spacer":
        newBlock = {
          id: newId,
          type: "spacer",
          props: { spacerHeight: 24 },
        };
        break;
      default:
        newBlock = {
          id: newId,
          type: "text",
          content: "Text block",
          props: {},
        };
    }

    setDesign((prev) => ({
      ...prev,
      blocks: [...prev.blocks, newBlock],
    }));
    setSelectedBlockId(newId);
    showToast(`เพิ่มบล็อก ${type} สำเร็จ`);
  };

  // Upload image to Cloudinary folder 'south-aero/admin/canvas'
  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedBlockId) return;

    if (file.size > 8 * 1024 * 1024) {
      showToast("ขนาดไฟล์ต้องไม่เกิน 8MB", "error");
      return;
    }

    setIsUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        const res = await uploadCanvasImageAction(dataUrl);

        if (res.success && res.data?.url) {
          updateBlock(selectedBlockId, (b) => ({
            ...b,
            props: {
              ...b.props,
              imageUrl: res.data!.url,
              cloudinaryPublicId: res.data!.publicId,
              // If product card
              ...(b.type === "product_card" ? { productImageUrl: res.data!.url } : {}),
            },
          }));
          showToast("อัปโหลดรูปภาพขึ้น Cloudinary สำเร็จ!");
        } else {
          showToast(res.error || "อัปโหลดไม่สำเร็จ", "error");
        }
        setIsUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      showToast("เกิดข้อผิดพลาดในการอัปโหลด", "error");
      setIsUploadingImage(false);
    }
  };

  // Handle Save Draft
  const handleSaveDraft = async () => {
    setIsSaving(true);
    const compiledHtml = compileCanvasToEmailHtml(design, subject, previewText);

    try {
      const res = await onSaveDraft({
        id: campaignId,
        subject,
        title,
        previewText,
        bannerImageUrl: design.blocks.find((b) => b.type === "image")?.props?.imageUrl,
        designJson: design,
        contentHtml: compiledHtml,
      });

      if (res.success) {
        showToast(res.message || "บันทึกแบบร่างสำเร็จ");
      } else {
        showToast(res.error || "บันทึกไม่สำเร็จ", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการบันทึก", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Send Test Email
  const handleSendTest = async () => {
    if (!testEmailAddress.trim()) {
      showToast("กรุณาระบุอีเมลสำหรับทดสอบ", "error");
      return;
    }

    setIsSending(true);
    const compiledHtml = compileCanvasToEmailHtml(design, subject, previewText);

    try {
      const res = await onSendBroadcast({
        id: campaignId,
        subject: `[TEST] ${subject}`,
        title,
        previewText,
        bannerImageUrl: design.blocks.find((b) => b.type === "image")?.props?.imageUrl,
        designJson: design,
        contentHtml: compiledHtml,
        testEmail: testEmailAddress.trim(),
      });

      if (res.success) {
        showToast(res.message || "ส่งอีเมลทดสอบเรียบร้อยแล้ว");
        setIsTestEmailModalOpen(false);
      } else {
        showToast(res.error || "ส่งทดสอบไม่สำเร็จ", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการส่ง", "error");
    } finally {
      setIsSending(false);
    }
  };

  // Handle Broadcast Send
  const handleSendBroadcast = async () => {
    if (!confirm(`ยืนยันการส่งกระจายข่าวสาร "${subject}" ไปยังผู้ติดตามทั้งหมด?`)) {
      return;
    }

    setIsSending(true);
    const compiledHtml = compileCanvasToEmailHtml(design, subject, previewText);

    try {
      const res = await onSendBroadcast({
        id: campaignId,
        subject,
        title,
        previewText,
        bannerImageUrl: design.blocks.find((b) => b.type === "image")?.props?.imageUrl,
        designJson: design,
        contentHtml: compiledHtml,
      });

      if (res.success) {
        showToast(res.message || "ส่งกระจายข่าวสารสำเร็จ!");
        setTimeout(() => {
          if (onClose) onClose();
        }, 1500);
      } else {
        showToast(res.error || "ส่งกระจายข่าวสารไม่สำเร็จ", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการส่ง", "error");
    } finally {
      setIsSending(false);
    }
  };

  const compiledEmailHtml = compileCanvasToEmailHtml(design, subject, previewText);

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0A0A] text-white flex flex-col overflow-hidden animate-fade-in">
      {/* ──────────────────────────────────────────────────────────
          1. Top App Bar (Header & Actions)
      ────────────────────────────────────────────────────────── */}
      <header className="h-16 bg-[#111111] border-b border-[#222222] px-4 sm:px-6 flex items-center justify-between gap-4 select-none shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-white font-black text-xs shadow-md">
            SA
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-red-500">
                CANVAS EMAIL BUILDER
              </span>
              <span className="px-1.5 py-0.5 rounded text-[0.62rem] font-bold bg-[#242424] text-gray-300 font-mono">
                WYSIWYG 100% MATCH
              </span>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ชื่อแคมเปญ / Campaign Title..."
              className="bg-transparent border-none text-sm font-semibold text-white focus:outline-none focus:ring-1 focus:ring-red-500 rounded px-1 -ml-1 truncate max-w-[280px] sm:max-w-md"
            />
          </div>
        </div>

        {/* Center: Device Mode Switcher */}
        <div className="hidden md:flex items-center bg-[#1A1A1A] border border-[#2D2D2D] rounded-lg p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setPreviewDevice("desktop")}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 font-medium transition-all ${
              previewDevice === "desktop"
                ? "bg-[#2A2A2A] text-white shadow-sm"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Monitor size={14} />
            <span>Desktop (600px)</span>
          </button>
          <button
            type="button"
            onClick={() => setPreviewDevice("mobile")}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 font-medium transition-all ${
              previewDevice === "mobile"
                ? "bg-[#2A2A2A] text-white shadow-sm"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Smartphone size={14} />
            <span>Mobile (375px)</span>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setIsLivePreviewModalOpen(true)}
            className="px-3 py-1.5 rounded bg-[#1C1C1C] hover:bg-[#252525] border border-[#303030] text-xs font-semibold text-gray-200 flex items-center gap-1.5 transition-colors"
          >
            <Eye size={14} />
            <span className="hidden sm:inline">Preview HTML</span>
          </button>

          <button
            type="button"
            onClick={() => setIsTestEmailModalOpen(true)}
            className="px-3 py-1.5 rounded bg-[#1C1C1C] hover:bg-[#252525] border border-[#303030] text-xs font-semibold text-gray-200 flex items-center gap-1.5 transition-colors"
          >
            <Send size={14} className="text-amber-400" />
            <span className="hidden sm:inline">Send Test</span>
          </button>

          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="px-3 py-1.5 rounded bg-[#1C1C1C] hover:bg-[#282828] border border-[#383838] text-xs font-semibold text-white flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            onClick={handleSendBroadcast}
            disabled={isSending}
            className="btn-primary text-xs px-4 py-1.5 rounded flex items-center gap-1.5 font-bold tracking-wider uppercase shadow-lg shadow-red-900/30 disabled:opacity-50"
          >
            {isSending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Zap size={14} className="fill-current" />
            )}
            <span>Broadcast</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#222222] transition-colors ml-1"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </header>

      {/* ──────────────────────────────────────────────────────────
          2. Subject & Metadata Quick Ribbon
      ────────────────────────────────────────────────────────── */}
      <div className="bg-[#141414] border-b border-[#242424] px-6 py-2.5 flex flex-col md:flex-row items-stretch md:items-center gap-3 text-xs shrink-0">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-gray-400 font-bold uppercase tracking-wider whitespace-nowrap">
            Subject:
          </span>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="หัวข้ออีเมลที่จะแสดงใน Inbox ของลูกค้า (Subject line)..."
            className="bg-[#1C1C1C] border border-[#2E2E2E] rounded px-3 py-1.5 text-white flex-1 focus:border-red-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2 flex-1">
          <span className="text-gray-400 font-bold uppercase tracking-wider whitespace-nowrap">
            Preheader:
          </span>
          <input
            type="text"
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            placeholder="ข้อความตัวอย่างที่แสดงถัดจากหัวข้อใน Inbox..."
            className="bg-[#1C1C1C] border border-[#2E2E2E] rounded px-3 py-1.5 text-gray-300 flex-1 focus:border-red-500 focus:outline-none"
          />
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────
          3. Main Canvas Workspace (3-Columns: Toolbox | Canvas | Inspector)
      ────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Hidden File Input for Cloudinary Upload */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageFileUpload}
          accept="image/png, image/jpeg, image/webp, image/gif"
          className="hidden"
        />

        {/* ── Left Panel: Toolbox & Element Library ── */}
        <aside className="w-64 bg-[#0F0F0F] border-r border-[#222222] p-4 flex flex-col overflow-y-auto custom-scrollbar shrink-0 select-none">
          <p className="text-[0.65rem] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Layout size={13} className="text-red-500" />
            <span>Add Elements / Blocks</span>
          </p>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => addBlock("heading")}
              className="w-full p-2.5 rounded-lg bg-[#171717] hover:bg-[#202020] border border-[#282828] hover:border-red-500/50 text-left flex items-center gap-3 transition-all group cursor-pointer"
            >
              <div className="p-2 rounded bg-red-950/30 text-red-400 border border-red-900/30 group-hover:scale-105 transition-transform">
                <Type size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-200">Headline / Title</p>
                <p className="text-[0.65rem] text-gray-500">Oswald / Bold Heading</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => addBlock("text")}
              className="w-full p-2.5 rounded-lg bg-[#171717] hover:bg-[#202020] border border-[#282828] hover:border-red-500/50 text-left flex items-center gap-3 transition-all group cursor-pointer"
            >
              <div className="p-2 rounded bg-blue-950/30 text-blue-400 border border-blue-900/30 group-hover:scale-105 transition-transform">
                <AlignLeft size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-200">Paragraph Text</p>
                <p className="text-[0.65rem] text-gray-500">เนื้อหาข่าวสาร & คำอธิบาย</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => addBlock("image")}
              className="w-full p-2.5 rounded-lg bg-[#171717] hover:bg-[#202020] border border-[#282828] hover:border-red-500/50 text-left flex items-center gap-3 transition-all group cursor-pointer"
            >
              <div className="p-2 rounded bg-emerald-950/30 text-emerald-400 border border-emerald-900/30 group-hover:scale-105 transition-transform">
                <ImageIcon size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-200">Banner / Image</p>
                <p className="text-[0.65rem] text-gray-500">อัปโหลดรูปขึ้น Cloudinary</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => addBlock("product_card")}
              className="w-full p-2.5 rounded-lg bg-[#171717] hover:bg-[#202020] border border-[#282828] hover:border-red-500/50 text-left flex items-center gap-3 transition-all group cursor-pointer"
            >
              <div className="p-2 rounded bg-amber-950/30 text-amber-400 border border-amber-900/30 group-hover:scale-105 transition-transform">
                <Package size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-200">Product Card (2-Col)</p>
                <p className="text-[0.65rem] text-gray-500">การ์ดเปิดตัวสินค้า & CFD Spec</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => addBlock("button")}
              className="w-full p-2.5 rounded-lg bg-[#171717] hover:bg-[#202020] border border-[#282828] hover:border-red-500/50 text-left flex items-center gap-3 transition-all group cursor-pointer"
            >
              <div className="p-2 rounded bg-purple-950/30 text-purple-400 border border-purple-900/30 group-hover:scale-105 transition-transform">
                <Square size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-200">Action Button (CTA)</p>
                <p className="text-[0.65rem] text-gray-500">ปุ่มกดลิงก์ไปยังหน้าร้าน</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => addBlock("divider")}
              className="w-full p-2.5 rounded-lg bg-[#171717] hover:bg-[#202020] border border-[#282828] hover:border-red-500/50 text-left flex items-center gap-3 transition-all group cursor-pointer"
            >
              <div className="p-2 rounded bg-gray-800 text-gray-300 border border-gray-700 group-hover:scale-105 transition-transform">
                <Minus size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-200">Divider & Spacer</p>
                <p className="text-[0.65rem] text-gray-500">เส้นคั่น / ช่องว่าง</p>
              </div>
            </button>
          </div>

          {/* Cloudinary Storage Info Note */}
          <div className="mt-6 p-3 rounded bg-[#141414] border border-[#242424] text-[0.65rem] text-gray-400">
            <p className="font-bold text-gray-200 flex items-center gap-1 mb-1">
              <FolderOpen size={12} className="text-red-400" />
              <span>Cloudinary Asset Path</span>
            </p>
            <p className="font-mono text-[0.62rem] text-gray-400 break-all">
              south-aero/admin/canvas
            </p>
          </div>
        </aside>

        {/* ── Center: Visual WYSIWYG Canvas ── */}
        <main className="flex-1 bg-[#050505] p-4 sm:p-8 overflow-y-auto custom-scrollbar flex justify-center items-start">
          <div
            className={`transition-all duration-300 bg-[#121212] border border-[#242424] rounded-lg shadow-2xl overflow-hidden min-h-[500px] ${
              previewDevice === "desktop" ? "w-[600px] max-w-full" : "w-[375px] max-w-full"
            }`}
          >
            {design.blocks.map((block, index) => {
              const isSelected = selectedBlockId === block.id;
              const p = block.props || {};

              return (
                <div
                  key={block.id}
                  onClick={() => setSelectedBlockId(block.id)}
                  className={`relative group transition-all cursor-pointer ${
                    isSelected
                      ? "ring-2 ring-red-500 ring-offset-2 ring-offset-[#121212] bg-red-950/5"
                      : "hover:outline hover:outline-1 hover:outline-red-500/40"
                  }`}
                  style={{
                    backgroundColor: p.backgroundColor || "transparent",
                    paddingTop: `${p.paddingTop ?? 12}px`,
                    paddingBottom: `${p.paddingBottom ?? 12}px`,
                    paddingLeft: "24px",
                    paddingRight: "24px",
                  }}
                >
                  {/* Floating Action Controls on Hover/Select */}
                  <div
                    className={`absolute top-2 right-2 z-30 flex items-center gap-1 bg-[#1E1E1E] border border-[#333333] rounded px-1.5 py-1 shadow-lg transition-opacity ${
                      isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-[0.6rem] font-mono text-gray-400 font-bold px-1 uppercase">
                      {block.type}
                    </span>
                    <button
                      type="button"
                      onClick={() => moveBlock(index, "up")}
                      disabled={index === 0}
                      className="p-1 hover:text-white text-gray-400 disabled:opacity-30"
                      title="Move Up"
                    >
                      <MoveUp size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveBlock(index, "down")}
                      disabled={index === design.blocks.length - 1}
                      className="p-1 hover:text-white text-gray-400 disabled:opacity-30"
                      title="Move Down"
                    >
                      <MoveDown size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => duplicateBlock(index)}
                      className="p-1 hover:text-white text-gray-400"
                      title="Duplicate"
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteBlock(block.id)}
                      className="p-1 hover:text-red-400 text-gray-400"
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* ── Block Content Renderers ── */}
                  {block.type === "header" && (
                    <div className="text-center py-2 border-b-2 border-red-600">
                      <div className="font-heading text-2xl font-black tracking-[0.2em] text-white">
                        SOUTH <span className="text-red-500">AERO</span>
                      </div>
                      <div className="text-[0.55rem] font-heading font-semibold tracking-[0.35em] text-gray-400 uppercase -mt-0.5">
                        PERFORMANCE AERODYNAMICS
                      </div>
                    </div>
                  )}

                  {block.type === "heading" && (
                    <div style={{ textAlign: p.textAlign || "center" }}>
                      <h2
                        style={{
                          fontFamily: p.fontFamily || "Oswald",
                          fontSize: `${p.fontSize || 26}px`,
                          fontWeight: p.fontWeight || "700",
                          color: p.color || "#FFFFFF",
                          lineHeight: 1.3,
                        }}
                        className="uppercase tracking-wide"
                      >
                        {block.content || "Heading Text"}
                      </h2>
                    </div>
                  )}

                  {block.type === "text" && (
                    <div style={{ textAlign: p.textAlign || "left" }}>
                      <p
                        style={{
                          fontFamily: p.fontFamily || "Inter",
                          fontSize: `${p.fontSize || 14}px`,
                          color: p.color || "#A3A3A3",
                          lineHeight: p.lineHeight || 1.6,
                        }}
                        className="whitespace-pre-line"
                      >
                        {block.content || "Click to edit text..."}
                      </p>
                    </div>
                  )}

                  {block.type === "image" && (
                    <div className="flex justify-center">
                      <img
                        src={p.imageUrl || "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80"}
                        alt={p.imageAlt || "South Aero Image"}
                        className="w-full max-h-[380px] object-cover rounded border border-[#2B2B2B]"
                      />
                    </div>
                  )}

                  {block.type === "product_card" && (
                    <div
                      className="rounded border border-[#2D2D2D] p-4 flex flex-col sm:flex-row items-center sm:items-start gap-4"
                      style={{ backgroundColor: p.backgroundColor || "#171717" }}
                    >
                      <img
                        src={p.productImageUrl || "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=600&q=80"}
                        alt={p.productTitle || "Product"}
                        className="w-full sm:w-44 h-32 object-cover rounded border border-[#333333] shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        {p.productBadge && (
                          <span className="text-[0.62rem] font-heading font-bold text-red-500 tracking-wider uppercase block mb-1">
                            {p.productBadge}
                          </span>
                        )}
                        <h3 className="font-heading font-bold text-base text-white uppercase truncate">
                          {p.productTitle || "Product Title"}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                          {p.productDescription || ""}
                        </p>
                        {p.productSpecs && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {p.productSpecs.map((s, idx) => (
                              <span
                                key={idx}
                                className="text-[0.62rem] font-mono px-2 py-0.5 rounded bg-[#242424] text-gray-300 border border-[#333333]"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {block.type === "button" && (
                    <div style={{ textAlign: p.textAlign || "center" }}>
                      <span
                        style={{
                          backgroundColor: p.buttonBgColor || "#DC2626",
                          color: p.buttonTextColor || "#FFFFFF",
                          borderRadius: `${p.buttonBorderRadius || 2}px`,
                        }}
                        className="inline-block px-7 py-3 font-heading font-bold text-xs tracking-widest uppercase shadow-lg select-none"
                      >
                        {p.buttonText || "BUTTON CTA"}
                      </span>
                    </div>
                  )}

                  {block.type === "divider" && (
                    <hr style={{ borderColor: p.dividerColor || "#262626" }} className="my-0" />
                  )}

                  {block.type === "spacer" && (
                    <div style={{ height: `${p.spacerHeight || 20}px` }} className="w-full flex items-center justify-center">
                      <span className="text-[0.55rem] font-mono text-gray-600 opacity-0 group-hover:opacity-100">
                        {p.spacerHeight || 20}px Spacer
                      </span>
                    </div>
                  )}

                  {block.type === "footer" && (
                    <div className="text-center py-2 text-xs border-t border-[#222222]">
                      <p className="font-heading font-bold text-white tracking-widest text-xs uppercase">
                        SOUTH AERO PERFORMANCE
                      </p>
                      <p className="text-[0.65rem] text-gray-500 mt-0.5">
                        High-Performance Aerodynamics & CFD Engineering • Thailand
                      </p>
                      <p className="text-[0.6rem] text-gray-600 mt-2">
                        คุณได้รับอีเมลนี้เนื่องจากสมัครรับข่าวสารจาก South Aero |{" "}
                        <span className="underline text-gray-500">Unsubscribe</span>
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </main>

        {/* ── Right Panel: Style Inspector ── */}
        <aside className="w-80 bg-[#0F0F0F] border-l border-[#222222] p-5 overflow-y-auto custom-scrollbar shrink-0 select-none">
          <div className="flex items-center justify-between border-b border-[#222222] pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Sliders size={16} className="text-red-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Block Inspector
              </h3>
            </div>
            {selectedBlock && (
              <span className="text-[0.62rem] font-mono font-bold px-2 py-0.5 rounded bg-red-950/40 text-red-400 border border-red-900/30 uppercase">
                {selectedBlock.type}
              </span>
            )}
          </div>

          {selectedBlock ? (
            <div className="space-y-5 text-xs">
              {/* Content Editor */}
              {(selectedBlock.type === "heading" || selectedBlock.type === "text") && (
                <div>
                  <label className="block text-[0.68rem] font-bold uppercase text-gray-400 mb-1.5">
                    Text Content
                  </label>
                  <textarea
                    rows={4}
                    value={selectedBlock.content || ""}
                    onChange={(e) =>
                      updateBlock(selectedBlock.id, (b) => ({ ...b, content: e.target.value }))
                    }
                    className="w-full bg-[#1A1A1A] border border-[#2E2E2E] rounded p-2.5 text-white focus:border-red-500 focus:outline-none leading-relaxed"
                  />
                </div>
              )}

              {/* Typography Controls */}
              {(selectedBlock.type === "heading" || selectedBlock.type === "text") && (
                <>
                  <div>
                    <label className="block text-[0.68rem] font-bold uppercase text-gray-400 mb-1.5">
                      Font Family
                    </label>
                    <select
                      value={selectedBlock.props?.fontFamily || "Inter"}
                      onChange={(e) =>
                        updateBlock(selectedBlock.id, (b) => ({
                          ...b,
                          props: { ...b.props, fontFamily: e.target.value },
                        }))
                      }
                      className="w-full bg-[#1A1A1A] border border-[#2E2E2E] rounded px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                    >
                      {FONT_OPTIONS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[0.68rem] font-bold uppercase text-gray-400 mb-1.5">
                        Font Size (px)
                      </label>
                      <input
                        type="number"
                        min={10}
                        max={64}
                        value={selectedBlock.props?.fontSize || 16}
                        onChange={(e) =>
                          updateBlock(selectedBlock.id, (b) => ({
                            ...b,
                            props: { ...b.props, fontSize: Number(e.target.value) },
                          }))
                        }
                        className="w-full bg-[#1A1A1A] border border-[#2E2E2E] rounded px-3 py-1.5 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[0.68rem] font-bold uppercase text-gray-400 mb-1.5">
                        Alignment
                      </label>
                      <div className="flex bg-[#1A1A1A] border border-[#2E2E2E] rounded p-0.5">
                        {(["left", "center", "right"] as const).map((align) => (
                          <button
                            key={align}
                            type="button"
                            onClick={() =>
                              updateBlock(selectedBlock.id, (b) => ({
                                ...b,
                                props: { ...b.props, textAlign: align },
                              }))
                            }
                            className={`flex-1 py-1 flex items-center justify-center rounded ${
                              selectedBlock.props?.textAlign === align
                                ? "bg-red-600 text-white"
                                : "text-gray-400 hover:text-white"
                            }`}
                          >
                            {align === "left" && <AlignLeft size={13} />}
                            {align === "center" && <AlignCenter size={13} />}
                            {align === "right" && <AlignRight size={13} />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Color Palette */}
                  <div>
                    <label className="block text-[0.68rem] font-bold uppercase text-gray-400 mb-1.5">
                      Text Color
                    </label>
                    <div className="flex items-center gap-1.5 flex-wrap mb-2">
                      {COLOR_PRESETS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() =>
                            updateBlock(selectedBlock.id, (b) => ({
                              ...b,
                              props: { ...b.props, color: c.value },
                            }))
                          }
                          className="w-6 h-6 rounded-full border border-[#333333] transition-transform hover:scale-110"
                          style={{ backgroundColor: c.value }}
                          title={c.label}
                        />
                      ))}
                    </div>
                    <input
                      type="text"
                      value={selectedBlock.props?.color || "#FFFFFF"}
                      onChange={(e) =>
                        updateBlock(selectedBlock.id, (b) => ({
                          ...b,
                          props: { ...b.props, color: e.target.value },
                        }))
                      }
                      className="w-full bg-[#1A1A1A] border border-[#2E2E2E] rounded px-3 py-1.5 text-white font-mono text-xs"
                    />
                  </div>
                </>
              )}

              {/* Image & Cloudinary Upload Controls */}
              {(selectedBlock.type === "image" || selectedBlock.type === "product_card") && (
                <div className="space-y-3 p-3.5 rounded bg-[#141414] border border-[#262626]">
                  <p className="text-[0.7rem] font-bold text-white uppercase flex items-center gap-1.5">
                    <ImageIcon size={14} className="text-red-400" />
                    <span>Image Asset (Cloudinary)</span>
                  </p>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                    className="w-full py-2.5 px-3 rounded bg-red-950/30 hover:bg-red-900/40 border border-red-800/40 text-red-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {isUploadingImage ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Uploading to Cloudinary...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={14} />
                        <span>Upload to south-aero/admin/canvas</span>
                      </>
                    )}
                  </button>

                  <div>
                    <label className="block text-[0.65rem] text-gray-400 mb-1">
                      Or Paste Image URL:
                    </label>
                    <input
                      type="url"
                      value={
                        selectedBlock.type === "product_card"
                          ? selectedBlock.props?.productImageUrl || ""
                          : selectedBlock.props?.imageUrl || ""
                      }
                      onChange={(e) =>
                        updateBlock(selectedBlock.id, (b) => ({
                          ...b,
                          props: {
                            ...b.props,
                            imageUrl: e.target.value,
                            ...(b.type === "product_card" ? { productImageUrl: e.target.value } : {}),
                          },
                        }))
                      }
                      className="w-full bg-[#1C1C1C] border border-[#303030] rounded px-2.5 py-1.5 text-xs text-gray-300 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Product Card Specific Controls */}
              {selectedBlock.type === "product_card" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[0.68rem] font-bold uppercase text-gray-400 mb-1">
                      Badge Text
                    </label>
                    <input
                      type="text"
                      value={selectedBlock.props?.productBadge || ""}
                      onChange={(e) =>
                        updateBlock(selectedBlock.id, (b) => ({
                          ...b,
                          props: { ...b.props, productBadge: e.target.value },
                        }))
                      }
                      className="w-full bg-[#1A1A1A] border border-[#2E2E2E] rounded px-3 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[0.68rem] font-bold uppercase text-gray-400 mb-1">
                      Product Title
                    </label>
                    <input
                      type="text"
                      value={selectedBlock.props?.productTitle || ""}
                      onChange={(e) =>
                        updateBlock(selectedBlock.id, (b) => ({
                          ...b,
                          props: { ...b.props, productTitle: e.target.value },
                        }))
                      }
                      className="w-full bg-[#1A1A1A] border border-[#2E2E2E] rounded px-3 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[0.68rem] font-bold uppercase text-gray-400 mb-1">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={selectedBlock.props?.productDescription || ""}
                      onChange={(e) =>
                        updateBlock(selectedBlock.id, (b) => ({
                          ...b,
                          props: { ...b.props, productDescription: e.target.value },
                        }))
                      }
                      className="w-full bg-[#1A1A1A] border border-[#2E2E2E] rounded p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[0.68rem] font-bold uppercase text-gray-400 mb-1">
                      Product Link URL
                    </label>
                    <input
                      type="url"
                      value={selectedBlock.props?.productLinkUrl || ""}
                      onChange={(e) =>
                        updateBlock(selectedBlock.id, (b) => ({
                          ...b,
                          props: { ...b.props, productLinkUrl: e.target.value },
                        }))
                      }
                      className="w-full bg-[#1A1A1A] border border-[#2E2E2E] rounded px-3 py-1.5 text-white font-mono text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Button Specific Controls */}
              {selectedBlock.type === "button" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[0.68rem] font-bold uppercase text-gray-400 mb-1">
                      Button Label
                    </label>
                    <input
                      type="text"
                      value={selectedBlock.props?.buttonText || ""}
                      onChange={(e) =>
                        updateBlock(selectedBlock.id, (b) => ({
                          ...b,
                          props: { ...b.props, buttonText: e.target.value },
                        }))
                      }
                      className="w-full bg-[#1A1A1A] border border-[#2E2E2E] rounded px-3 py-1.5 text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[0.68rem] font-bold uppercase text-gray-400 mb-1">
                      Target Link URL
                    </label>
                    <input
                      type="url"
                      value={selectedBlock.props?.buttonUrl || ""}
                      onChange={(e) =>
                        updateBlock(selectedBlock.id, (b) => ({
                          ...b,
                          props: { ...b.props, buttonUrl: e.target.value },
                        }))
                      }
                      className="w-full bg-[#1A1A1A] border border-[#2E2E2E] rounded px-3 py-1.5 text-white font-mono text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[0.65rem] text-gray-400 mb-1">
                        Bg Color
                      </label>
                      <input
                        type="color"
                        value={selectedBlock.props?.buttonBgColor || "#DC2626"}
                        onChange={(e) =>
                          updateBlock(selectedBlock.id, (b) => ({
                            ...b,
                            props: { ...b.props, buttonBgColor: e.target.value },
                          }))
                        }
                        className="w-full h-8 rounded bg-transparent cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-[0.65rem] text-gray-400 mb-1">
                        Text Color
                      </label>
                      <input
                        type="color"
                        value={selectedBlock.props?.buttonTextColor || "#FFFFFF"}
                        onChange={(e) =>
                          updateBlock(selectedBlock.id, (b) => ({
                            ...b,
                            props: { ...b.props, buttonTextColor: e.target.value },
                          }))
                        }
                        className="w-full h-8 rounded bg-transparent cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Padding & Spacing Controls */}
              <div className="pt-3 border-t border-[#222222]">
                <label className="block text-[0.68rem] font-bold uppercase text-gray-400 mb-2">
                  Padding Spacing (px)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[0.62rem] text-gray-500">Top Padding</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={selectedBlock.props?.paddingTop ?? 12}
                      onChange={(e) =>
                        updateBlock(selectedBlock.id, (b) => ({
                          ...b,
                          props: { ...b.props, paddingTop: Number(e.target.value) },
                        }))
                      }
                      className="w-full bg-[#1A1A1A] border border-[#2E2E2E] rounded px-2.5 py-1 text-white text-xs mt-1"
                    />
                  </div>
                  <div>
                    <span className="text-[0.62rem] text-gray-500">Bottom Padding</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={selectedBlock.props?.paddingBottom ?? 12}
                      onChange={(e) =>
                        updateBlock(selectedBlock.id, (b) => ({
                          ...b,
                          props: { ...b.props, paddingBottom: Number(e.target.value) },
                        }))
                      }
                      className="w-full bg-[#1A1A1A] border border-[#2E2E2E] rounded px-2.5 py-1 text-white text-xs mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500 flex flex-col items-center justify-center h-64 border border-dashed border-[#222222] rounded-lg">
              <HelpCircle size={28} className="text-gray-600 mb-2" />
              <p className="text-xs font-semibold text-gray-400">Select a Block</p>
              <p className="text-[0.68rem] text-gray-600 mt-1">
                คลิกเลือกบล็อกใดก็ได้ใน Canvas ตรงกลางเพื่อปรับแต่งฟอนต์ สี และรูปภาพ
              </p>
            </div>
          )}
        </aside>
      </div>

      {/* ──────────────────────────────────────────────────────────
          4. Live HTML Preview Modal
      ────────────────────────────────────────────────────────── */}
      {isLivePreviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-4xl bg-[#121212] border border-[#2A2A2A] rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#222222] bg-[#181818]">
              <div className="flex items-center gap-2">
                <Eye size={18} className="text-red-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Email Client Live Render Preview
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLivePreviewModalOpen(false)}
                className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-white/5"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-[#080808]">
              <iframe
                srcDoc={compiledEmailHtml}
                title="Email Preview"
                className="w-full h-[600px] border border-[#262626] rounded bg-[#0A0A0A]"
              />
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          5. Send Test Email Modal
      ────────────────────────────────────────────────────────── */}
      {isTestEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-[#141414] border border-[#2A2A2A] rounded-xl shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-[#242424] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Send size={18} className="text-amber-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Send Test Email
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTestEmailModalOpen(false)}
                className="p-1 rounded text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-400 mb-3">
              ระบบจะส่งอีเมลตัวอย่างแบบ 100% Exact Format ไปยังอีเมลที่ระบุด้านล่าง เพื่อให้คุณตรวจสอบก่อนส่งจริง
            </p>

            <label className="block text-xs font-bold text-gray-300 uppercase mb-1.5">
              Recipient Email:
            </label>
            <input
              type="email"
              value={testEmailAddress}
              onChange={(e) => setTestEmailAddress(e.target.value)}
              placeholder="your-email@example.com"
              className="w-full bg-[#1C1C1C] border border-[#333333] rounded px-3 py-2 text-sm text-white mb-4 focus:border-red-500 focus:outline-none"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsTestEmailModalOpen(false)}
                className="px-4 py-2 rounded bg-[#222222] hover:bg-[#2A2A2A] text-xs font-semibold text-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendTest}
                disabled={isSending}
                className="btn-primary text-xs px-5 py-2 rounded font-bold uppercase flex items-center gap-1.5"
              >
                {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                <span>Dispatch Test Email</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-2xl flex items-center gap-2.5 text-xs font-bold tracking-wide animate-fade-in border ${
            toastMessage.type === "success"
              ? "bg-emerald-950/90 text-emerald-300 border-emerald-800"
              : "bg-red-950/90 text-red-300 border-red-800"
          }`}
        >
          {toastMessage.type === "success" ? (
            <Check size={16} className="text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle size={16} className="text-red-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
}
