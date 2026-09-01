export type AeroLanguage = "th" | "en";

export interface TelemetryStat {
  id: string;
  metric: string;
  value: string;
  label: Record<AeroLanguage, string>;
  description: Record<AeroLanguage, string>;
}

export interface SpeedDataPoint {
  speedKmh: number;
  dragIndex: number; // proportional to v^2
  powerFactor: number; // proportional to v^3
  dragForceN: number; // approx in Newtons for average sedan
  energyPctOvercomingDrag: number;
  evRangePenaltyPct: number;
}

export interface AeropartItem {
  id: string;
  title: Record<AeroLanguage, string>;
  category: Record<AeroLanguage, string>;
  tagline: Record<AeroLanguage, string>;
  principle: Record<AeroLanguage, string>;
  primaryFunction: Record<AeroLanguage, string>;
  performanceGain: Record<AeroLanguage, string>;
  downforceImpact: string; // e.g. "+24%" or "Neutral"
  dragImpact: string; // e.g. "-2.5%" or "+15%"
  image: string;
  deepDive: Record<AeroLanguage, string>;
  keyFact: Record<AeroLanguage, string>;
}

export interface ActiveAeroItem {
  id: string;
  title: Record<AeroLanguage, string>;
  mechanism: Record<AeroLanguage, string>;
  impact: Record<AeroLanguage, string>;
  stat: string;
}

export const AERODYNAMICS_TELEMETRY_STATS: TelemetryStat[] = [
  {
    id: "drag-reduction",
    metric: "15% - 25%",
    value: "15 - 25%",
    label: {
      th: "ลดแรงต้านอากาศรวม",
      en: "Total Drag Reduction",
    },
    description: {
      th: "ชุดแต่งแอโรพาร์ทที่ผ่านการจำลอง CFD สามารถลดแรงต้านอากาศของตัวรถลงได้อย่างมีนัยสำคัญ",
      en: "CFD-optimized aerodynamic packages measurably reduce baseline exterior aerodynamic drag.",
    },
  },
  {
    id: "fuel-economy",
    metric: "5% - 12%",
    value: "5 - 12%",
    label: {
      th: "ประหยัดน้ำมันเดินทาง",
      en: "Real-World Fuel Savings",
    },
    description: {
      th: "การลดแรงต้านช่วยลดการกินน้ำมันในสภาวะการเดินทางบนทางหลวงที่ความเร็ว 100 - 140 กม./ชม.",
      en: "Lower form drag directly translates into fuel economy gains during highway cruising speeds.",
    },
  },
  {
    id: "diffuser-efficiency",
    metric: "~50%",
    value: "50%",
    label: {
      th: "แรงกดจากดิฟฟิวเซอร์",
      en: "Underbody Downforce Share",
    },
    description: {
      th: "ดิฟฟิวเซอร์ใต้ท้องรถสร้างแรงกดได้ถึง 50% ของตัวรถ แต่เพิ่มแรงต้านเพียง 10% - 20% เท่านั้น",
      en: "Underbody diffusers generate up to 50% of total downforce while incurring merely 10-20% drag.",
    },
  },
  {
    id: "gurney-boost",
    metric: "+24%",
    value: "+24%",
    label: {
      th: "แรงกดเพิ่มด้วย Gurney Flap",
      en: "Gurney Flap Downforce Boost",
    },
    description: {
      th: "ครีบเล็กเพียง 1-5% ของความกว้างปีกช่วยดันแรงกดขึ้น 24% โดยแทบไม่เพิ่มภาระแรงต้าน",
      en: "A miniature tab sized 1-5% of wing chord yields up to 24% higher downforce with minimal penalty.",
    },
  },
  {
    id: "wheel-drag",
    metric: "25% - 30%",
    value: "25 - 30%",
    label: {
      th: "แรงต้านจากล้อและซุ้มล้อ",
      en: "Wheel Assembly Drag Share",
    },
    description: {
      th: "ล้อที่หมุนเปิดโล่งสร้างกระแสลมปั่นป่วนที่เป็นต้นเหตุของแรงต้านกว่าหนึ่งในสี่ของรถยนต์ทั้งคัน",
      en: "Exposed rotating wheels and wheel wells generate 25-30% of total passenger car aerodynamic drag.",
    },
  },
  {
    id: "ev-range",
    metric: "+2% - 3%",
    value: "+2 - 3%",
    label: {
      th: "ระยะทาง EV เพิ่มขึ้น",
      en: "EV Battery Range Extender",
    },
    description: {
      th: "ในรถยนต์ไฟฟ้า การลดแรงต้านอากาศลงทุกๆ 10% จะเพิ่มระยะทางวิ่งต่อการชาร์จได้ 2% - 3% ทันที",
      en: "Every 10% aerodynamic drag cut directly extends electric vehicle range by 2% to 3%.",
    },
  },
];

export const SPEED_CURVE_DATA: SpeedDataPoint[] = [
  {
    speedKmh: 60,
    dragIndex: 36,
    powerFactor: 216,
    dragForceN: 180,
    energyPctOvercomingDrag: 18,
    evRangePenaltyPct: 0,
  },
  {
    speedKmh: 80,
    dragIndex: 64,
    powerFactor: 512,
    dragForceN: 320,
    energyPctOvercomingDrag: 26,
    evRangePenaltyPct: 5,
  },
  {
    speedKmh: 100,
    dragIndex: 100,
    powerFactor: 1000,
    dragForceN: 500,
    energyPctOvercomingDrag: 35,
    evRangePenaltyPct: 12,
  },
  {
    speedKmh: 120,
    dragIndex: 144,
    powerFactor: 1728,
    dragForceN: 720,
    energyPctOvercomingDrag: 46,
    evRangePenaltyPct: 22,
  },
  {
    speedKmh: 140,
    dragIndex: 196,
    powerFactor: 2744,
    dragForceN: 980,
    energyPctOvercomingDrag: 54,
    evRangePenaltyPct: 34,
  },
  {
    speedKmh: 160,
    dragIndex: 256,
    powerFactor: 4096,
    dragForceN: 1280,
    energyPctOvercomingDrag: 62,
    evRangePenaltyPct: 48,
  },
];

export const AEROPARTS_ANATOMY: AeropartItem[] = [
  {
    id: "spoiler-vs-wing",
    title: {
      th: "สปอยเลอร์ vs ปีกวิงหลัง (Spoiler vs. Wing)",
      en: "Spoiler vs. Wing: The Critical Distinction",
    },
    category: {
      th: "ระบบอากาศพลศาสตร์ด้านท้าย",
      en: "Rear Aerodynamic Systems",
    },
    tagline: {
      th: "ทำไมสปอยเลอร์จึงลดแรงต้านและช่วยประหยัดน้ำมัน ในขณะที่วิงหลังเน้นแรงกดยึดเกาะถนน?",
      en: "Why spoilers reduce drag and save fuel, whereas wings focus strictly on high-speed grip.",
    },
    principle: {
      th: "หลักการทำลายการเกาะตัว (Flow Spoil) vs หลักการเบอร์นูลลี (Inverted Airfoil)",
      en: "Boundary Layer Tripping vs. Bernoulli Inverted Airfoil Lift Differential",
    },
    primaryFunction: {
      th: "สปอยเลอร์ (Spoiler) ออกแบบมาเพื่อ 'ขัดขวาง' (Spoil) กระแสลมที่ไหลเกาะกระจกหลัง ช่วยตัดแรงยก (Lift) และบีบโซนลมวนท้ายรถให้เล็กลง ผลลัพธ์คือ ลดแรงต้านอากาศ (Drag) และประหยัดน้ำมัน! ส่วนวิงหลัง (Wing) คือปีกคว่ำลอยตัวเหนือตัวรถ ทำหน้าที่เร่งลมใต้ปีกสร้างแรงดูดมหาศาลเพื่อกดแชสซีลงกับถนน",
      en: "A spoiler physically disrupts air adhering to the rear window, eliminating dangerous high-speed lift while reducing wake size and aerodynamic drag. Conversely, a wing is a free-standing inverted airfoil operating in clean air to generate tremendous mechanical tire load through Bernoulli's suction.",
    },
    performanceGain: {
      th: "สปอยเลอร์: ลดแรงยก 80-95%, ลดแรงต้าน 2-5% | วิงหลัง: สร้างแรงกด +150 ถึง +500 นิวตัน",
      en: "Spoiler: Cuts rear lift by 80-95%, reduces drag by 2-5% | Wing: Generates +150N to +500N of downforce",
    },
    downforceImpact: "+150N to +450N (Wing)",
    dragImpact: "-3.2% (Spoiler)",
    image: "/images/G9 KIT2/08.png",
    deepDive: {
      th: "บทเรียนประวัติศาสตร์: Audi TT รุ่นแรกเปิดตัวด้วยบั้นท้ายโค้งมนเรียบหรู แต่กลายเป็นหายนะเมื่อความเร็วสูง กระแสลมที่แนบสนิทสร้างแรงยกมหาศาลทำให้เพลาหลังลอยและเกิดอุบัติเหตุรุนแรง อาวดี้จึงต้องเรียกรถคืนฉุกเฉินเพื่อติดตั้ง 'สปอยเลอร์หลัง' เล็กๆ ซึ่งช่วยตัดชั้นลมวนและคืนเสถียรภาพกลับมาได้ทันที",
      en: "Historical Case: The original Audi TT's sleek teardrop rear caused fatal high-speed instability because attached airflow created catastrophic aerodynamic lift. Audi initiated an emergency recall mandating a rear decklid spoiler, which successfully tripped the boundary layer, canceled the lift vector, and restored highway stability.",
    },
    keyFact: {
      th: "สปอยเลอร์ที่ออกแบบถูกต้องไม่ได้ทำให้รถวิ่งช้าลง แต่ช่วยให้รถประหยัดน้ำมันขึ้นและนิ่งขึ้นในความเร็วสูง",
      en: "A properly engineered spoiler does not slow your car down—it makes it more fuel-efficient and planted.",
    },
  },
  {
    id: "underbody-diffuser",
    title: {
      th: "ดิฟฟิวเซอร์ใต้ท้องรถ (Underbody Diffuser)",
      en: "Underbody Diffuser & Ground Effect",
    },
    category: {
      th: "การจัดการลมใต้ท้องรถ (Ground Effect)",
      en: "Undercarriage Aerodynamics",
    },
    tagline: {
      th: "ชิ้นส่วนที่คุ้มค่าที่สุดในโลกของอากาศพลศาสตร์: สร้างแรงกด 50% แต่เพิ่มแรงต้านเพียงนิดเดียว",
      en: "The most aerodynamically efficient device: 50% of total downforce for only 10-20% drag penalty.",
    },
    principle: {
      th: "ปรากฏการณ์เวนจูรี (Venturi Effect) และการคืนแรงดันอย่างนุ่มนวล (Pressure Recovery)",
      en: "Venturi Channel Acceleration & Gradual Adverse Pressure Recovery",
    },
    primaryFunction: {
      th: "ทำงานร่วมกับแผ่นปิดใต้ท้องรถที่เรียบสนิท อากาศใต้ท้องรถถูกบีบให้เร่งความเร็วสูงขึ้น ทำให้เกิดโซนแรงดันต่ำ (แรงดูด) ที่ดึงตัวรถลงสู่พื้นถนน จากนั้นครีบดิฟฟิวเซอร์ที่ลาดเอียง 10-15 องศาจะค่อยๆ ขยายปริมาตรเพื่อชะลอความเร็วลมกลับสู่สภาวะปกติอย่างราบรื่น ไม่ชนกับลมท้ายรถ",
      en: "Operating with smooth underfloor panels, incoming air is accelerated through a restricted throat, dropping static pressure and creating a powerful suction force. The 10-15° upward diffuser ramp gently expands and decelerates the air, smoothly blending it back with ambient wake pressure.",
    },
    performanceGain: {
      th: "สร้างแรงกดได้ถึง 50% ของตัวรถโดยรวม โดยก่อให้เกิดแรงต้านเพียง 10-20% เท่านั้น",
      en: "Generates up to 50% of the entire vehicle's downforce footprint while producing only 10-20% drag.",
    },
    downforceImpact: "Up to 50% Share",
    dragImpact: "+10% - 20% Drag Only",
    image: "/images/G9 KIT2/05.png",
    deepDive: {
      th: "ความสำคัญของครีบแบ่งช่อง (Strakes): การติดตั้งครีบแนวตั้งช่วยล็อกกระแสลมไม่ให้ไหลเปะปะออกด้านข้าง และสร้างกระแสวนตามแนวยาว (Streamwise Vortices) ช่วยเพิ่มพลังงานให้ชั้นอากาศไม่หลุดจากตัวดิฟฟิวเซอร์ ป้องกันอาการ Diffuser Stall",
      en: "The Role of Vertical Strakes: Fences inside the diffuser compartmentalize expanding airflow and generate streamwise vortices. These vortices energize the boundary layer, preventing catastrophic airflow separation and aerodynamic stall.",
    },
    keyFact: {
      th: "มุมลาดเอียงที่ดีที่สุดของดิฟฟิวเซอร์คือ 10 - 15 องศา หากชันเกิน 20 องศา ลมจะหลุด (Stall) และสูญเสียแรงกดทันที",
      en: "The optimal diffuser expansion angle is 10°-15°. Anything steeper than 20° causes boundary separation and stall.",
    },
  },
  {
    id: "gurney-flap",
    title: {
      th: "เกอร์นีย์ แฟลป (The Gurney Flap)",
      en: "The Gurney Flap: Micro Tab, Mega Grip",
    },
    category: {
      th: "นวัตกรรมมอเตอร์สปอร์ต",
      en: "Motorsport Micro-Aero",
    },
    tagline: {
      th: "แผ่นตั้งฉากขนาดจิ๋วเพียง 1-5% ของปีก แต่เพิ่มแรงกดได้สูงถึง 24% โดยไม่ฉุดความเร็ว",
      en: "A diminutive 1-5% vertical tab that increases wing downforce by up to 24% with negligible drag.",
    },
    principle: {
      th: "การสร้างกระแสลมหมุนวนคู่สวนทาง (Counter-Rotating Vortices) และการเลื่อน Kutta Condition",
      en: "Trailing Edge Vortex Shedding & Kutta Condition Geometric Manipulation",
    },
    primaryFunction: {
      th: "คิดค้นโดย แดน เกอร์นีย์ (Dan Gurney) ตำนานนักแข่งรถ เป็นแผ่นตั้งฉากขนาดเล็กติดไว้ที่ขอบหลังสุดของปีก แผ่นนี้จะบังคับให้ลมบนปีกชะลอตัวสร้างแรงดันกดที่สูงขึ้น และปล่อยกระแสวนคู่ที่ช่วยเร่งลมใต้ปีกให้ไหลเร็วยิ่งขึ้น ป้องกันไม่ให้อากาศหลุดจากปีกแม้ใช้มุมปะทะที่ชัน",
      en: "Invented by American racing legend Dan Gurney, this small right-angle tab sits on the wing's trailing edge. It forces upper surface air to decelerate (raising static pressure) while shedding counter-rotating vortices that accelerate under-wing suction air, delaying stall at aggressive angles of attack.",
    },
    performanceGain: {
      th: "เพิ่มแรงกดสูงสุด +24% ในขณะที่เพิ่มแรงเสียดทานเพียงเล็กน้อยเท่านั้น",
      en: "Augments peak downforce by up to +24% with an imperceptible friction drag penalty.",
    },
    downforceImpact: "+24% Downforce",
    dragImpact: "+0.8% Friction Only",
    image: "/images/G9 KIT2/09.png",
    deepDive: {
      th: "ความลับในสนาม Formula 1: รถ F1 และรถแข่ง Super GT ทุกลำนำหลักการ Gurney Flap ไปติดตั้งที่ปีกหน้าและปีกหลัง ช่วยให้วิศวกรสามารถปรับเปลี่ยนสมดุลแรงกดของรถตามสภาพอากาศหรือสนามแข่งได้อย่างรวดเร็วเพียงแค่เปลี่ยนขนาดแถบไม่กี่มิลลิเมตร",
      en: "Formula 1 Secret Weapon: Front and rear wings in top-tier motorsport rely on Gurney flaps because engineers can fine-tune downforce balance and aero efficiency for different circuits by adjusting a lip merely millimeters tall.",
    },
    keyFact: {
      th: "ขนาดที่สมบูรณ์แบบคือ 1.5% - 2.5% ของความกว้างปีก หากสูงเกินไปจะกลายเป็นสิ่งกีดขวางที่สร้างแรงต้าน",
      en: "The sweet spot is 1.5% - 2.5% of wing chord. Exceeding 5% creates unnecessary pressure drag.",
    },
  },
  {
    id: "canards-dive-planes",
    title: {
      th: "คานาร์ด / ไดฟ์เพลน (Canards & Dive Planes)",
      en: "Canards & Vortex Air Curtains",
    },
    category: {
      th: "การควบคุมลมส่วนหน้าและซุ้มล้อ",
      en: "Front Fascia & Wheelhouse Aerodynamics",
    },
    tagline: {
      th: "สร้าง 'ม่านอากาศเสมือน' ปกป้องตัวรถจากลมปั่นป่วนของซุ้มล้อหน้า",
      en: "Generating tight streamwise vortices to create a virtual air curtain around front wheels.",
    },
    principle: {
      th: "การสร้างกระแสวนตามแนวยาว (Streamwise Vortices) และการชี้นำลม (Flow Conditioning)",
      en: "High-Energy Longitudinal Vortex Generation & Boundary Layer Sealing",
    },
    primaryFunction: {
      th: "คานาร์ดคือปีกเล็กๆ รูปทรงโค้งติดบริเวณมุมกันชนหน้า นอกจากจะสร้างแรงกดกดล้อหน้าแล้ว หน้าที่หลักที่สำคัญที่สุดคือการสร้าง 'พายุลมวนหมุนเกลียว' ไหลเลียบด้านข้างตัวรถ ลมวนนี้ทำหน้าที่เหมือนม่านกำแพงลม ปัดเป่าลมปั่นป่วนที่ทะลักออกจากซุ้มล้อหน้าไม่ให้มาทำลายอากาศที่ไหลผ่านข้างตัวถัง",
      en: "Mounted on outer bumper corners, canards produce localized front-axle downforce. More importantly, they cast high-energy corkscrew vortices down the vehicle flanks that act as virtual air curtains, deflecting chaotic turbulent wake away from exposed front wheel assemblies.",
    },
    performanceGain: {
      th: "เพิ่มการยึดเกาะของหน้ารถ และลดการกวนของกระแสลมข้างตัวถัง",
      en: "Stabilizes front-end high-speed steering response and seals boundary flow along side skirts.",
    },
    downforceImpact: "+40N to +100N Front",
    dragImpact: "-1.5% via Wake Control",
    image: "/images/G9 KIT2/02.png",
    deepDive: {
      th: "ทำไมล้อหน้าถึงมีปัญหา? ล้อรถยนต์หมุนด้วยความเร็วสูงเหมือนใบพัดขนาดใหญ่ พัดลมปั่นป่วนกระจายออกทุกทิศทาง คานาร์ดและสปลิตเตอร์หน้าของ South Aeropart ทำงานประสานกันเพื่อจัดระเบียบและปัดลมเหล่านี้ออกไปทางด้านข้างอย่างเป็นระเบียบ",
      en: "Why Wheel Arches Matter: Rapidly spinning wheels act like open impellers, spraying chaotic, high-drag air laterally. Canards and front splitters work together to shield and redirect this turbulence safely into low-drag paths.",
    },
    keyFact: {
      th: "คานาร์ดไม่ได้มีไว้เพื่อความเท่อย่างเดียว แต่เป็นตัวจัดระเบียบลมที่ปกป้องแอโรพาร์ทชิ้นอื่นๆ ทางด้านหลัง",
      en: "Canards act as aerodynamic gatekeepers, preparing clean airflow for the side skirts and rear diffuser.",
    },
  },
  {
    id: "aero-wheels",
    title: {
      th: "ล้อและฝาครอบแอโร (Aerodynamic Wheels & Covers)",
      en: "Aero Wheels: Taming the 30% Drag Monster",
    },
    category: {
      th: "การหมุนของล้อและแรงต้านข้างลำตัว",
      en: "Rotational Fluid Dynamics",
    },
    tagline: {
      th: "รู้หรือไม่? ล้อที่เปิดโล่งสร้างแรงต้านถึง 30% ของรถยนต์ทั้งคัน การปิดก้านล้อช่วยประหยัดน้ำมันทันที",
      en: "Did you know? Exposed wheels generate 30% of total car drag. Closed designs yield immediate savings.",
    },
    principle: {
      th: "การลดการสูญเสียจากการหมุนวน (Impeller Effect Reduction) และการปิดผนึกซุ้มล้อ",
      en: "Wheel Cavity Containment & Rotational Pumping Loss Suppression",
    },
    primaryFunction: {
      th: "ล้อก้านเปิดทั่วไปทำหน้าที่เหมือนเครื่องกวนอากาศ เมื่อรถวิ่งเร็ว ลมจะถูกใบก้านล้อปั่นจนระเบิดออกด้านข้าง ทำลายการไหลของอากาศข้างตัวรถ การใช้ดีไซน์ล้อแอโรที่มีการปิดทึบประมาณ 87% จะช่วยกักเก็บลมปั่นป่วนให้อยู่ในซุ้มล้อ ลดแรงต้านของรถทั้งคันลงได้ถึง 2.7% ถึง 5%",
      en: "Spoked open wheels act like air agitators, slinging chaotic turbulence into passing airflow. Utilizing aerodynamic wheel designs with ~87% surface coverage encapsulates wheelhouse turbulence, slashing vehicle drag by 2.7% to 5.0%.",
    },
    performanceGain: {
      th: "ลดแรงต้านรวมของตัวรถ 2.7% - 5% และช่วยเพิ่มระยะทางวิ่งของรถยนต์ไฟฟ้า (EV)",
      en: "Reduces total vehicle drag by 2.7% - 5.0%, providing direct highway range improvements for EVs.",
    },
    downforceImpact: "Neutral",
    dragImpact: "-2.7% to -5.0% Drag",
    image: "/images/G9 KIT2/03.png",
    deepDive: {
      th: "มาตรฐานใน Tesla, Porsche Taycan, และ Lucid Air: สังเกตรถยนต์ไฟฟ้ายุคใหม่จะใช้ล้อก้านปิดทึบหรือมีฝาครอบแอโรที่ถอดได้ เพราะที่ความเร็ว 120 กม./ชม. ล้อคือหนึ่งในจุดที่สูญเสียพลังงานมากที่สุดในรถยนต์",
      en: "Modern EV Blueprint: EVs like Tesla, Porsche Taycan, and Lucid Air feature aerodynamic covers because at highway speeds, exposed wheels represent one of the single biggest energy drains on the battery.",
    },
    keyFact: {
      th: "การเปลี่ยนดีไซน์ล้อให้มีแอโรไดนามิกที่ดีเทียบเท่ากับการอัปเกรดขนาดแบตเตอรี่แบบฟรีๆ",
      en: "Optimizing wheel aerodynamics acts like a free battery capacity boost without adding a single kilogram.",
    },
  },
];

export const ACTIVE_AERO_TECHNOLOGY: ActiveAeroItem[] = [
  {
    id: "ags",
    title: {
      th: "กระจังหน้าเปิด-ปิดอัตโนมัติ (Active Grille Shutters - AGS)",
      en: "Active Grille Shutters (AGS)",
    },
    mechanism: {
      th: "ระบบจะปิดช่องดักลมหน้ารถอัตโนมัติเมื่ออุณหภูมิเครื่องยนต์หรือแบตเตอรี่ยังไม่สูง บังคับให้อากาศไหลผ่านฝากระโปรงอย่างราบรื่น แทนที่จะพุ่งเข้าไปปะทะหม้อน้ำและห้องเครื่องที่เต็มไปด้วยสิ่งกีดขวาง",
      en: "Algorithms physically shut front grille louvers during cruising or cold operation, smoothly directing air over the hood instead of into the aerodynamically chaotic engine bay.",
    },
    impact: {
      th: "ลดแรงต้านจากการระบายความร้อน (Cooling drag) ลงได้ราว 7.85% ช่วยประหยัดแบตเตอรี่และน้ำมันอย่างมหาศาล",
      en: "Eliminates cooling drag (which represents 5-12% of car drag), cutting overall wind resistance by ~7.85%.",
    },
    stat: "7.85% Drag Cut",
  },
  {
    id: "active-suspension",
    title: {
      th: "ช่วงล่างถุงลมปรับความสูงอัตโนมัติ (Active Air Suspension)",
      en: "Active Air Suspension Ride Height Lowering",
    },
    mechanism: {
      th: "เมื่อรถทำความเร็วสูงถึงระดับที่กำหนด ระบบจะปล่อยลมเพื่อลดความสูงใต้ท้องรถลง ลดพื้นที่หน้าตัดที่ปะทะลม (Frontal Area A) และจำกัดไม่ให้อากาศส่วนเกินมุดเข้าใต้ท้องรถ",
      en: "At highway speeds, pneumatic suspension squats the chassis closer to the pavement, reducing projected frontal area and minimizing turbulent airflow entering the undercarriage.",
    },
    impact: {
      th: "ลดค่าสัมประสิทธิ์แรงต้าน (Cd) ลงเฉลี่ย 0.010 ช่วยให้ตัวรถลู่ลมและเกาะถนนมั่นคงขึ้น",
      en: "Consistently lowers drag coefficient (Cd) by 0.010 while enhancing chassis high-speed stability.",
    },
    stat: "-0.010 Cd",
  },
  {
    id: "lamborghini-ala",
    title: {
      th: "ระบบกระจายแรงกดแอโรเวกเตอร์ (Lamborghini ALA System)",
      en: "Aerodynamic Vectoring (Lamborghini ALA)",
    },
    mechanism: {
      th: "มีแผ่นฟลิบไฟฟ้าซ่อนอยู่ในสปลิตเตอร์หน้าและเสาวงปีกหลัง เมื่อขับทางตรง แผ่นจะเปิดเพื่อ 'สลัดแรงกดทิ้ง' ทำความเร็วสูงสุด แต่เมื่อเข้าโค้ง ระบบจะปิดแผ่นฝั่งด้านในโค้งเพื่อกดล้อด้านในให้เกาะถนนอย่างรุนแรง",
      en: "Electric flaps inside the front splitter and hollow rear wing open on straights to shed drag for top speed, and close asymmetrically in turns to heavily pin inner tires to the asphalt.",
    },
    impact: {
      th: "เพิ่มความเร็วในการเข้าโค้งได้โดยไม่ต้องพึ่งพาระบบกระจายแรงบิดแบบกลไกที่มีน้ำหนักมาก",
      en: "Delivers unmatched cornering agility and eliminates body roll without heavy mechanical torque vectoring.",
    },
    stat: "Zero-Lag Aero Vectoring",
  },
  {
    id: "active-diffuser",
    title: {
      th: "ดิฟฟิวเซอร์หลังยืดหดได้ (Active Rear Diffusers)",
      en: "Active Translating Rear Diffusers",
    },
    mechanism: {
      th: "ซ่อนตัวแนบเนียนใต้กันชนหลังในยามปกติ และจะเลื่อนตัวยืดออกไปด้านหลังเมื่อทำความเร็วสูง เพื่อขยายท่อเวนจูรีให้ยาวขึ้น ป้องกันไม่ให้อากาศแรงดันสูงด้านบนพังทลายลงมากวนลมใต้ท้องรถ",
      en: "Diffusers concealed flush at low speeds slide rearward at high speed, elongating the Venturi chamber and preventing roof airflow from collapsing prematurely into the underbody wake.",
    },
    impact: {
      th: "สามารถลดแรงต้านอากาศท้ายรถลงได้สูงสุดถึง 10%",
      en: "Achieves additional wake isolation and up to a 10% drag reduction at cruising speeds.",
    },
    stat: "Up to 10% Drag Cut",
  },
];

export const RACING_PHENOMENA = {
  porpoising: {
    title: {
      th: "ปรากฏการณ์รถกระเด้งกระดอน (The Porpoising Effect)",
      en: "The 'Porpoising' Effect: Ground Effect Phenomenon",
    },
    subtitle: {
      th: "บทเรียนราคาแพงจากสนามแข่ง Formula 1 ปี 2022 ที่สร้างความฮือฮาไปทั่วโลก",
      en: "A harsh fluid-structure interaction lesson from Formula 1's ground-effect era.",
    },
    story: {
      th: "Porpoising ไม่ใช่ความล้มเหลวทางเครื่องยนต์หรือช่างยนต์ แต่เป็นวงจรการสะท้อนทางฟิสิกส์อากาศพลศาสตร์ (Hysteresis Loop): เมื่อรถวิ่งเร็วมาก ท่อเวนจูรีใต้ท้องรถจะสร้างแรงดูดมหาศาล ดึงแชสซีให้แนบชิดพื้นถนนขึ้นเรื่อยๆ จนกระทั่งถึงจุดที่ระยะห่างต่ำเกินไป ช่องแคบของท่อจะ 'อั้น' (Choke) ไม่ให้อากาศผ่าน ส่งผลให้เกิดการแยกตัวของอากาศและสูญเสียแรงกดทันที! เมื่อไร้แรงกด สปริงช่วงล่างที่ถูกบดอัดจะดีดตัวรถขึ้นฟ้าทันที เมื่อรถลอยขึ้น ท่อเวนจูรีก็กลับมาดูดใหม่ เกิดการกระเด้งขึ้นลงซ้ำๆ ด้วยความถี่สูงกว่า 10 ครั้งต่อวินาที เหมือนปลาโลมากระโดดน้ำ (Porpoise)",
      en: "Porpoising is an aerodynamic hysteresis loop driven by floor Venturi tunnels. At high speeds, massive ground-effect suction draws the car closer and closer to the track. When clearance becomes critically narrow, airflow chokes, leading to sudden boundary layer separation and an instantaneous collapse of downforce. Released from this enormous load, stiff suspension springs violently pitch the chassis upward. With ride height restored, flow reattaches, downforce snaps back, and the cycle repeats up to 10 times per second—resembling a leaping porpoise.",
    },
    solution: {
      th: "การแก้ไข: วิศวกรต้องยกความสูงใต้ท้องรถขึ้นเล็กน้อย ใช้แดมเปอร์ที่หนืดขึ้น หรือใช้ครีบ Vortex Generators เพื่อเติมพลังงานให้อากาศบริเวณคอคอดไม่เกิดอาการอั้น",
      en: "The Solution: Raising static ride height, applying non-linear suspension damping, and incorporating specialized vortex generators to energize throat boundary layers.",
    },
  },
  aeroacoustics: {
    title: {
      th: "อากาศพลศาสตร์เสียงและเสียงรบกวนในห้องโดยสาร (Aeroacoustics & NVH)",
      en: "Aeroacoustics & Cabin NVH Optimization",
    },
    subtitle: {
      th: "ทำไมเมื่อขับรถเกิน 100 กม./ชม. เสียงลมถึงกลายเป็นศัตรูอันดับหนึ่งของความสบาย?",
      en: "Why aerodynamic turbulence becomes the dominant noise source past 100 km/h.",
    },
    story: {
      th: "เมื่อรถยนต์ไฟฟ้าไร้เสียงคำรามของเครื่องยนต์ เสียงที่ผู้โดยสารได้ยินชัดที่สุดคือเสียงลม (Aeroacoustics) จุดที่วิกฤตที่สุดคือเสา A-pillar และกระจกมองข้าง ลมที่ปะทะมุมเสาจะม้วนตัวกลายเป็นพายุกรวยสามมิติกระหน่ำตีผิวกระจกหน้าต่างด้วยความถี่กว้าง และหากเปิดกระจกแง้มไว้เพียงเล็กน้อย ลมวนอาจตรงกับความถี่ธรรมชาติของห้องโดยสาร ก่อให้เกิด 'เสียงสะท้อนเฮล์มโฮลทซ์' (Helmholtz Resonance) ซึ่งเป็นเสียงทุ้มสั่นสะเทือนจนหูอื้อ",
      en: "With silent EV powertrains, wind noise dominates cabin acoustics above 100 km/h. The primary culprits are A-pillar vortices and side mirror wakes pounding against side glass. Furthermore, cracking a window slightly can couple vortices with cabin air cavity harmonics, triggering deafening low-frequency Helmholtz resonance throbbing.",
    },
    solution: {
      th: "การแก้ไข: ลบมุมเสา A-pillar ให้เนียนเรียบ, ติดตั้งตัวจัดระเบียบลม Vortex Generators หรือเปลี่ยนกระจกมองข้างเป็นกล้องแอโรไดนามิก (Camera Pods)",
      en: "The Solution: Smoothing A-pillar contours, installing vortex trip strips, and transitioning to aerodynamic camera mirror pods.",
    },
  },
};

export const SOUTH_AERO_VALIDATION = {
  title: {
    th: "มาตรฐานวิศวกรรมและการทดสอบของ South Aeropart",
    en: "South Aeropart Engineering & Validation Standards",
  },
  subtitle: {
    th: "เราไม่ได้ทำแค่ชุดแต่งเพื่อความสวยงาม แต่เราออกแบบชิ้นส่วนอากาศพลศาสตร์ที่ผ่านการทดสอบจริง",
    en: "Not just aesthetic dress-up: race-engineered functional aerodynamics backed by simulation and track data.",
  },
  pillars: [
    {
      step: "01",
      title: {
        th: "3D Laser Chassis Scanning",
        en: "Sub-Millimeter 3D Optical Scanning",
      },
      description: {
        th: "สแกนโครงสร้างรถยนต์จริงระดับไมครอน เพื่อให้ชิ้นงานแนบสนิทกับตัวถังโรงงาน 100% ไม่มีช่องว่างที่ทำให้เกิดเสียงลมหรือการหลุดร่อน",
        en: "Digitizing factory chassis geometry to ensure exact fitment, zero panel gap leaks, and seamless airflow transitions.",
      },
    },
    {
      step: "02",
      title: {
        th: "High-Resolution CFD Analysis",
        en: "CFD Simulation (RANS & DDES)",
      },
      description: {
        th: "จำลองการไหลของอากาศด้วยแบบจำลองพลศาสตร์ของไหลขั้นสูง วิเคราะห์ความดัน (Pressure Contours) และกระแสลมวน (Vortex Streamlines) เพื่อสร้างสมดุลแรงกดหน้า-หลังที่ปลอดภัย",
        en: "Utilizing advanced turbulence models to map boundary layers, pressure stagnation zones, and front/rear downforce balance.",
      },
    },
    {
      step: "03",
      title: {
        th: "Autoclave Pre-Preg Dry Carbon",
        en: "Autoclave Pre-Preg Vacuum Dry Carbon",
      },
      description: {
        th: "ผลิตด้วยคาร์บอนไฟเบอร์พรีเพร็กแท้ อบด้วยแรงดันและอุณหภูมิสูง ชิ้นงานจึงมีความแข็งแกร่งสูงสุด น้ำหนักเบาเป็นพิเศษ และไม่โก่งตัวเมื่อปะทะแรงกดมหาศาลที่ความเร็ว 200+ กม./ชม.",
        en: "Cured under immense heat and pressure in industrial autoclaves to guarantee zero flex or flutter under extreme aerodynamic loads.",
      },
    },
    {
      step: "04",
      title: {
        th: "Moving-Ground & Proving Ground Test",
        en: "High-Speed Track & Proving Ground Validation",
      },
      description: {
        th: "ทดสอบการขับขี่จริงบนสนามแข่งทางตรงและโค้ง เพื่อยืนยันว่าชิ้นส่วนสร้างแรงกดที่มั่นคง ไม่มีอาการสั่นสะเทือน และไม่สร้างเสียงรบกวนที่ผิดปกติ",
        en: "Track-tested in dynamic yaw and high-speed pitch conditions to verify balanced steering response, zero flutter, and acoustic comfort.",
      },
    },
  ],
};

export const FAQ_ITEMS = [
  {
    question: {
      th: "สปอยเลอร์ทำให้รถกินน้ำมันมากขึ้นหรือไม่?",
      en: "Does a rear spoiler increase fuel consumption?",
    },
    answer: {
      th: "ตรงกันข้ามกับความเชื่อทั่วไป! สปอยเลอร์ (Spoiler) ที่ออกแบบอย่างถูกต้องทางวิศวกรรมจะช่วยตัดกระแสลมที่เกาะท้ายรถ ลดขนาดของโซนลมหมุนวน (Wake) และหักล้างแรงยก ทำให้แรงต้านอากาศรวมของรถลดลง จึงช่วยให้รถประหยัดน้ำมันยิ่งขึ้นในความเร็วเดินทาง",
      en: "Contrary to common belief, a properly designed spoiler actually reduces fuel consumption! By tripping the boundary layer at the trunk edge, it shrinks the turbulent low-pressure wake zone behind the car, actively reducing total form drag.",
    },
  },
  {
    question: {
      th: "ทำไมถึงไม่ควรติดวิงหลังขนาดใหญ่เพียงชิ้นเดียวโดยไม่มีสปลิตเตอร์หน้า?",
      en: "Why shouldn't you install a large rear wing without a front splitter?",
    },
    answer: {
      th: "เพราะจะทำให้เสีย 'สมดุลแรงกด' (Aerodynamic Balance)! การมีแรงกดที่เพลาหลังมากเกินไปโดยไม่มีแรงกดที่หน้ารถ จะทำให้หน้ารถลอยและเกิดอาการ 'หน้าดื้อ' (Understeer) อย่างรุนแรงในโค้งความเร็วสูง ชุดแต่งที่ดีต้องได้รับการคำนวณอัตราส่วนแรงกดหน้าและหลังให้สมดุลเสมอ",
      en: "Because it destroys the vehicle's aerodynamic balance! Excessive rear downforce without corresponding front-axle downforce levers weight off the front tires, inducing dangerous high-speed understeer. A balanced package (splitter + wing) is essential.",
    },
  },
  {
    question: {
      th: "คาร์บอนไฟเบอร์แท้ของ South Aeropart ดีกว่างานไฟเบอร์กลาสทั่วไปอย่างไรในแง่ของอากาศพลศาสตร์?",
      en: "Why is South Aeropart's dry carbon superior to standard fiberglass for aerodynamics?",
    },
    answer: {
      th: "เรื่องความแข็งเกร็ง (Stiffness): ชิ้นงานไฟเบอร์กลาสทั่วไปจะเกิดการบิดงอหรือกระพือ (Deflection & Flutter) เมื่อเจอลมปะทะที่ความเร็ว 120-180 กม./ชม. ทำให้องศาปะทะของอากาศเพี้ยนและสูญเสียแรงกด ในขณะที่ Autoclave Pre-Preg Dry Carbon ของ South Aeropart คงรูปทรงเรขาคณิตได้ 100% แม้รับแรงกดหลายร้อยนิวตัน",
      en: "Structural stiffness under load: Wet fiberglass components flex and flutter at highway and track speeds (120-180+ km/h), distorting aerodynamic profiles. South Aeropart's pre-preg dry carbon remains completely rigid, maintaining engineered airflow contours under hundreds of Newtons of load.",
    },
  },
  {
    question: {
      th: "รถยนต์ไฟฟ้า (EV) ได้ประโยชน์จากแอโรไดนามิกส์มากกว่ารถยนต์สันดาปจริงหรือ?",
      en: "Do Electric Vehicles (EVs) benefit more from aerodynamics than gasoline cars?",
    },
    answer: {
      th: "จริงอย่างยิ่ง! รถ EV มีมอเตอร์ที่มีประสิทธิภาพสูงมากอยู่แล้ว ทำให้ความสูญเสียพลังงานหลักเมื่อวิ่งทางไกลมาจากแรงต้านอากาศล้วนๆ งานวิจัยยืนยันว่าการลดแรงต้านอากาศลงทุกๆ 10% จะเพิ่มระยะทางวิ่งของแบตเตอรี่ได้ 2% - 3% ทันทีโดยไม่ต้องเปลี่ยนแบตเตอรี่ใหม่",
      en: "Absolutely! Because EV powertrains are already over 90% efficient, aerodynamic drag is the dominant consumer of battery energy on the highway. Every 10% reduction in drag yields an immediate 2-3% increase in real-world range.",
    },
  },
];
