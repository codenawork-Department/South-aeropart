// Mock data for UI development — High fidelity South Aero catalog & gallery

export type MockProduct = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  categorySlug: string;
  categoryName: string;
  price: string;
  compareAtPrice?: string;
  description: string;
  shortDescription: string;
  compatibility: {
    make: string;
    model: string;
    yearFrom: number;
    yearTo: number;
  }[];
  material: string;
  finish: string;
  finishOptions: string[];
  installation: string;
  weightKg: string;
  downforceN?: number;
  dragN?: number;
  downforceBefore?: number;
  downforceAfter?: number;
  dragBefore?: number;
  dragAfter?: number;
  images: string[];
  features: {
    title: string;
    description: string;
  }[];
  isFeatured?: boolean;
};

export const MOCK_PRODUCTS: MockProduct[] = [
  {
    id: "1",
    slug: "ducktail-spoiler-accord-g9",
    name: "Ducktail Spoiler",
    brand: "South Aero",
    categorySlug: "spoilers",
    categoryName: "Spoilers",
    price: "5990.00",
    compareAtPrice: "6990.00",
    description:
      "Elevate the stance and performance of your vehicle with this aggressively styled, integrated ducktail spoiler. Engineered specifically to complement the widened profile of the Honda Accord G9, this custom-molded component perfectly balances race-inspired aesthetics with functional aerodynamic benefits.",
    shortDescription:
      "Sleek, aggressive, and precision-engineered. Designed to elevate the rear profile of your Accord with a performance-inspired edge.",
    compatibility: [{ make: "Honda", model: "Accord (G9)", yearFrom: 2013, yearTo: 2017 }],
    material: "ABS Plastic / Pre-preg Carbon Fiber",
    finish: "Gloss Black",
    finishOptions: ["Gloss Black", "Matte Black", "Carbon Fiber Weave"],
    installation: "3M VHB Tape / Screws included",
    weightKg: "1.2",
    downforceN: 155,
    dragN: -4,
    downforceBefore: -89.51,
    downforceAfter: 66.04,
    dragBefore: 886.37,
    dragAfter: 882.77,
    images: [
      "/images/DETAIL g9/01.jpg",
      "/images/DETAIL g9/02.jpg",
      "/images/DETAIL g9/03.jpg",
      "/images/DETAIL g9/04.jpg",
      "/images/DETAIL g9/05.jpg",
    ],
    features: [
      {
        title: "High-Speed Downforce Generation",
        description:
          "The pronounced upward sweep of the ducktail is specifically angled to intercept airflow traveling over the roofline, redirecting vortex turbulence into positive downforce.",
      },
      {
        title: "Reduced Lift & Improved Traction",
        description:
          "Generating substantial downforce to push the rear tires into the pavement for maximum high-speed grip and braking confidence.",
      },
      {
        title: "Superior Stability",
        description:
          "By reducing factory rear-end aerodynamic lift, the ducktail ensures the rear axle remains planted during aggressive corner entry.",
      },
      {
        title: "Seamless CAD Integration",
        description:
          "Sculpted using 3D laser-scanned vehicle dimensions to flow naturally into the trunk lines and quarter panels for a factory-level fit.",
      },
    ],
    isFeatured: true,
  },
  {
    id: "2",
    slug: "carbon-fiber-front-lip-accord-g9",
    name: "Carbon Fiber Front Lip",
    brand: "South Aero",
    categorySlug: "front-lips",
    categoryName: "Front Lips",
    price: "4590.00",
    compareAtPrice: "5290.00",
    description:
      "Aggressive front splitter and lip spoiler engineered to manage air entering the underbody. Crafted from multi-layer dry carbon fiber with UV-resistant high gloss clear coat.",
    shortDescription:
      "High-downforce carbon front splitter designed for the Honda Accord G9 aerodynamic body kit.",
    compatibility: [{ make: "Honda", model: "Accord (G9)", yearFrom: 2013, yearTo: 2017 }],
    material: "Pre-preg Carbon Fiber",
    finish: "Carbon Fiber Weave",
    finishOptions: ["Carbon Fiber Weave", "Gloss Black", "Forged Carbon"],
    installation: "Under-chassis mounting brackets & 3M tape",
    weightKg: "2.1",
    downforceN: 110,
    dragN: -2,
    downforceBefore: 12.4,
    downforceAfter: 122.4,
    dragBefore: 420.1,
    dragAfter: 418.1,
    images: [
      "/images/G9 KIT2/01.png",
      "/images/G9 KIT2/02.png",
      "/images/FRONT.png",
      "/images/00.jpg",
    ],
    features: [
      {
        title: "Front Axle Downforce",
        description: "Accelerates oncoming air beneath the bumper to create a low-pressure suction zone.",
      },
      {
        title: "Motorsport Aerodynamics",
        description: "Built-in corner winglets channel air around front tire turbulence.",
      },
    ],
    isFeatured: true,
  },
  {
    id: "3",
    slug: "carbon-fiber-side-skirts-accord-g9",
    name: "Carbon Fiber Side Skirts",
    brand: "South Aero",
    categorySlug: "side-skirts",
    categoryName: "Side Skirts",
    price: "5190.00",
    compareAtPrice: "5990.00",
    description:
      "Precision-engineered aerodynamic side skirt extensions that control lateral airflow spill between the front and rear axles, stabilizing underbody air pressure.",
    shortDescription:
      "Aerodynamic side extensions designed to complete the low-profile stance of the Accord G9.",
    compatibility: [{ make: "Honda", model: "Accord (G9)", yearFrom: 2013, yearTo: 2017 }],
    material: "Pre-preg Carbon Fiber",
    finish: "Gloss Black",
    finishOptions: ["Gloss Black", "Carbon Fiber Weave", "Matte Black"],
    installation: "Bolt-on under-sill with factory mount points",
    weightKg: "3.4",
    downforceN: 45,
    dragN: -3,
    downforceBefore: 20.0,
    downforceAfter: 65.0,
    dragBefore: 610.5,
    dragAfter: 607.5,
    images: [
      "/images/G9 KIT2/03.png",
      "/images/G9 KIT2/04.png",
      "/images/AS.png",
      "/images/01.jpg",
    ],
    features: [
      {
        title: "Side Turbulence Reduction",
        description: "Prevents high-pressure side air from dirtying the low-pressure stream under the car.",
      },
      {
        title: "Stance & Stiffening",
        description: "Adds an aggressive visual ground clearance drop without sacrificing chassis ride height.",
      },
    ],
    isFeatured: true,
  },
  {
    id: "4",
    slug: "carbon-fiber-rear-diffuser-accord-g9",
    name: "Carbon Fiber Rear Diffuser",
    brand: "South Aero",
    categorySlug: "diffusers",
    categoryName: "Rear Diffusers",
    price: "6990.00",
    compareAtPrice: "7990.00",
    description:
      "Multi-fin rear underbody diffuser designed to expand under-car airflow smoothly back to atmospheric pressure, preventing turbulent wake and creating strong ground suction.",
    shortDescription:
      "Functional multi-channel aerodynamic rear diffuser for enhanced high-speed rear grip.",
    compatibility: [{ make: "Honda", model: "Accord (G9)", yearFrom: 2013, yearTo: 2017 }],
    material: "Pre-preg Carbon Fiber",
    finish: "Carbon Fiber Weave",
    finishOptions: ["Carbon Fiber Weave", "Gloss Black", "Forged Carbon"],
    installation: "Direct bolt-on to rear subframe mounting points",
    weightKg: "2.8",
    downforceN: 135,
    dragN: -6,
    downforceBefore: 40.2,
    downforceAfter: 175.2,
    dragBefore: 750.8,
    dragAfter: 744.8,
    images: [
      "/images/G9 KIT2/05.png",
      "/images/G9 KIT2/06.png",
      "/images/BACK.png",
      "/images/04.jpg",
    ],
    features: [
      {
        title: "Venturi Acceleration",
        description: "Four contoured strakes guide air expansion for maximum low-pressure extraction.",
      },
      {
        title: "Exhaust Heat Shielding",
        description: "Includes high-temp composite heat barrier around quad exhaust cutouts.",
      },
    ],
    isFeatured: true,
  },
  {
    id: "5",
    slug: "accord-g9-complete-body-kit-02",
    name: "Accord G9 Complete Body Kit 02",
    brand: "South Aero",
    categorySlug: "body-kits",
    categoryName: "Body Kits",
    price: "21990.00",
    compareAtPrice: "24990.00",
    description:
      "The flagship South Aero Accord G9 Complete Aerodynamic Package 02. Includes Front Splitter Lip, Side Skirt Extensions, Rear Under Diffuser, and Rear Ducktail Spoiler. Complete CFD calibrated balance for true aerodynamic transformation.",
    shortDescription:
      "Full 4-piece aerodynamic package engineered for complete exterior transformation.",
    compatibility: [{ make: "Honda", model: "Accord (G9)", yearFrom: 2013, yearTo: 2017 }],
    material: "Pre-preg Carbon Fiber & High-Impact ABS",
    finish: "Gloss Black & Carbon",
    finishOptions: ["Gloss Black", "Carbon Fiber Weave"],
    installation: "Full mounting hardware kit included",
    weightKg: "9.5",
    downforceN: 445,
    dragN: -15,
    downforceBefore: 50.0,
    downforceAfter: 495.0,
    dragBefore: 890.0,
    dragAfter: 875.0,
    images: [
      "/images/FRONT.png",
      "/images/BACK.png",
      "/images/AS.png",
      "/images/G9 KIT2/07.png",
      "/images/G9 KIT2/08.png",
    ],
    features: [
      {
        title: "Total Aero Balance",
        description: "Front-to-rear downforce distribution tuned 42% front / 58% rear for neutral high-speed handling.",
      },
      {
        title: "Complete Package Discount",
        description: "Save over 15% compared to purchasing individual aerodynamic parts separately.",
      },
    ],
    isFeatured: true,
  },
  {
    id: "6",
    slug: "civic-fd-track-aero-package",
    name: "Civic FD Track Aero Package",
    brand: "South Aero",
    categorySlug: "body-kits",
    categoryName: "Body Kits",
    price: "18990.00",
    compareAtPrice: "21500.00",
    description:
      "Motorsport inspired aero package for the legendary Civic FD chassis. Features wide front air dam splitter, vented side steps, and high-downforce rear diffuser.",
    shortDescription:
      "Circuit-proven aerodynamic body kit designed for Honda Civic FD platform.",
    compatibility: [{ make: "Honda", model: "Civic FD", yearFrom: 2006, yearTo: 2011 }],
    material: "Vacuum-infused FRP / Carbon Fiber",
    finish: "Gloss Black",
    finishOptions: ["Gloss Black", "Carbon Fiber Weave", "Primer Unpainted"],
    installation: "Bolt-on with reinforced brackets",
    weightKg: "8.2",
    downforceN: 380,
    dragN: -10,
    images: [
      "/images/fd.png",
      "/images/CIVIC/01.png",
      "/images/CIVIC/fc03.png",
      "/images/CIVIC/fc04.png",
    ],
    features: [
      { title: "Track Tested", description: "Brake duct cooling inlets integrated directly into the front splitter." },
    ],
    isFeatured: false,
  },
  {
    id: "7",
    slug: "civic-fe-street-performance-kit",
    name: "Civic FE Street Performance Kit",
    brand: "South Aero",
    categorySlug: "body-kits",
    categoryName: "Body Kits",
    price: "19990.00",
    compareAtPrice: "22900.00",
    description:
      "Modern clean aero styling designed for the 11th Gen Civic FE. Sharp contours, low aerodynamic drag index, and precise OEM bumper integration.",
    shortDescription:
      "Next-generation sleek aerodynamic package for the Honda Civic FE.",
    compatibility: [{ make: "Honda", model: "Civic FE", yearFrom: 2021, yearTo: 2025 }],
    material: "ABS Plastic / Carbon Fiber",
    finish: "Gloss Black",
    finishOptions: ["Gloss Black", "Carbon Fiber Weave"],
    installation: "OEM mount points & 3M VHB",
    weightKg: "7.8",
    downforceN: 320,
    dragN: -12,
    images: [
      "/images/fe.png",
      "/images/CIVIC/02.png",
      "/images/CIVIC/03.jpg",
    ],
    features: [
      { title: "Modern Design Language", description: "Seamless lines complementing the 11th generation body profile." },
    ],
    isFeatured: false,
  },
  {
    id: "8",
    slug: "civic-type-r-clubsport-wing",
    name: "Civic Type R Clubsport Wing",
    brand: "South Aero",
    categorySlug: "spoilers",
    categoryName: "Spoilers",
    price: "16990.00",
    compareAtPrice: "18990.00",
    description:
      "Swan-neck adjustable GT rear wing for Civic Type R FL5 / FK8. CNC machined 6061-T6 aluminum uprights with multi-angle carbon fiber airfoil.",
    shortDescription:
      "Adjustable high-downforce swan neck carbon rear wing for Civic Type R.",
    compatibility: [
      { make: "Honda", model: "Civic FL5", yearFrom: 2022, yearTo: 2025 },
      { make: "Honda", model: "Civic FK8", yearFrom: 2017, yearTo: 2021 },
    ],
    material: "Autoclave Dry Carbon & Billet Aluminum",
    finish: "Matte Carbon / Anodized Black",
    finishOptions: ["Matte Carbon", "Gloss Carbon"],
    installation: "Reinforced hatch mount brackets",
    weightKg: "3.8",
    downforceN: 520,
    dragN: 18,
    images: [
      "/images/civic-r.jpg",
      "/images/CIVIC R/0r.png",
      "/images/CIVIC R/0rr.png",
    ],
    features: [
      { title: "Adjustable AOA", description: "5-stage Angle of Attack adjustments from 0° to 14°." },
    ],
    isFeatured: false,
  },
];

export const VEHICLE_MAKES = [
  { value: "honda", label: "Honda", logo: "H" },
  { value: "toyota", label: "Toyota", logo: "T" },
  { value: "bmw", label: "BMW", logo: "B" },
  { value: "mitsubishi", label: "Mitsubishi", logo: "M" },
];

export const VEHICLE_MODELS: Record<string, { value: string; label: string; yearRange: string }[]> = {
  honda: [
    { value: "accord-g9", label: "Accord G9", yearRange: "2013-2017" },
    { value: "civic-fk", label: "Civic FK / FC", yearRange: "2016-2021" },
    { value: "civic-fe", label: "Civic FE", yearRange: "2021-Present" },
    { value: "civic-fd", label: "Civic FD", yearRange: "2006-2011" },
    { value: "civic-fl5", label: "Civic Type R FL5", yearRange: "2022-Present" },
    { value: "city-gn", label: "City GN", yearRange: "2020-Present" },
  ],
  toyota: [
    { value: "camry-xv70", label: "Camry XV70", yearRange: "2018-2024" },
    { value: "corolla-altis", label: "Corolla Altis GR", yearRange: "2019-Present" },
    { value: "gr-yaris", label: "GR Yaris", yearRange: "2020-Present" },
  ],
  bmw: [
    { value: "3-series-g20", label: "3 Series (G20)", yearRange: "2019-Present" },
    { value: "4-series-g22", label: "4 Series (G22)", yearRange: "2020-Present" },
  ],
  mitsubishi: [
    { value: "lancer-ex", label: "Lancer EX", yearRange: "2008-2016" },
    { value: "evolution-x", label: "Lancer Evolution X", yearRange: "2008-2016" },
  ],
};

export type CartItem = {
  id: string;
  product: MockProduct;
  quantity: number;
  variant: string;
};

export const FEATURED_BODY_KIT = {
  name: "ACCORD G9 BODY KIT",
  version: "02",
  tagline: "Designed for Accord. Engineered for performance.",
  description:
    "Precision engineered to elevate the stance and performance of your Accord G9. Aerodynamic, functional, and built to stand out on the street and track.",
  designer: "South Aero Design Lab",
  downforceBadge: "+155 N",
  dragBadge: "-4 N",
  slides: [
    {
      id: 1,
      title: "Accord G9 Body Kit 02 — Front 3/4 Stance",
      image: "/images/FRONT.png",
      caption: "Sculpted front splitter and aerodynamically balanced profile.",
    },
    {
      id: 2,
      title: "Accord G9 Body Kit 02 — Rear Profile & Ducktail",
      image: "/images/BACK.png",
      caption: "High-downforce ducktail spoiler and multi-fin rear diffuser.",
    },
    {
      id: 3,
      title: "Accord G9 Body Kit 02 — Side Aerodynamic Flow",
      image: "/images/AS.png",
      caption: "Ground-effect side skirts with integrated flow channels.",
    },
    {
      id: 4,
      title: "Accord G9 Body Kit 02 — Track Testing & Fitment",
      image: "/images/g9r.png",
      caption: "Tested at speed for structural rigidity and real-world drag reduction.",
    },
  ],
};

export const CATEGORY_TABS = [
  { id: "shop", label: "SHOP", filter: "all" },
  { id: "collection", label: "COLLECTION", filter: "collection" },
  { id: "g9", label: "G9", filter: "g9" },
  { id: "gallery", label: "GALLERY", filter: "gallery" },
];

export const PRODUCT_CATEGORIES = [
  {
    slug: "front-lips",
    name: "FRONT LIP",
    image: "/images/G9 KIT2/01.png",
    productCount: "4 Products",
    href: "/products?category=front-lips",
  },
  {
    slug: "side-skirts",
    name: "SIDE SKIRTS",
    image: "/images/G9 KIT2/03.png",
    productCount: "3 Products",
    href: "/products?category=side-skirts",
  },
  {
    slug: "diffusers",
    name: "REAR DIFFUSER",
    image: "/images/G9 KIT2/05.png",
    productCount: "4 Products",
    href: "/products?category=diffusers",
  },
  {
    slug: "spoilers",
    name: "DUCKTAIL SPOILER",
    image: "/images/DETAIL g9/01.jpg",
    productCount: "6 Products",
    href: "/products/ducktail-spoiler-accord-g9",
  },
];

export type GalleryItem = {
  id: string;
  title: string;
  category: "accord-g9" | "civic-fd" | "civic-fe" | "civic-fl5" | "aero-cfd" | "brand";
  categoryLabel: string;
  model: string;
  image: string;
  aspect: "square" | "portrait" | "landscape" | "wide";
  partsInstalled?: string[];
  description?: string;
};

export const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: "g1",
    title: "Accord G9 White — Front Aero Splitter & Stance",
    category: "accord-g9",
    categoryLabel: "Accord G9",
    model: "Honda Accord G9 2.4",
    image: "/images/FRONT.png",
    aspect: "landscape",
    partsInstalled: ["Carbon Front Lip", "Side Skirt Extensions", "Custom Mesh"],
    description: "Aggressive front fascia with optimized low-pressure splitters for street & track.",
  },
  {
    id: "g2",
    title: "Accord G9 Rear Ducktail & Diffuser Installation",
    category: "accord-g9",
    categoryLabel: "Accord G9",
    model: "Honda Accord G9 2.0 EL",
    image: "/images/BACK.png",
    aspect: "landscape",
    partsInstalled: ["Ducktail Spoiler", "Rear Under Diffuser", "Quad Tips"],
    description: "Rear aerodynamic assembly generating +155N of downforce at highway speeds.",
  },
  {
    id: "g3",
    title: "Accord G9 Ducktail Spoiler Detail Close-up 01",
    category: "accord-g9",
    categoryLabel: "Accord G9",
    model: "Honda Accord G9",
    image: "/images/DETAIL g9/01.jpg",
    aspect: "square",
    partsInstalled: ["Ducktail Spoiler in Gloss Black"],
    description: "Seamless trunk lid contouring with flush edge fitment.",
  },
  {
    id: "g4",
    title: "Accord G9 Ducktail Side Profile Angle",
    category: "accord-g9",
    categoryLabel: "Accord G9",
    model: "Honda Accord G9",
    image: "/images/DETAIL g9/02.jpg",
    aspect: "square",
    partsInstalled: ["Ducktail Spoiler"],
    description: "Upward swept angle intercepting roofline slipstream.",
  },
  {
    id: "g5",
    title: "Accord G9 Trunk Line Alignment",
    category: "accord-g9",
    categoryLabel: "Accord G9",
    model: "Honda Accord G9",
    image: "/images/DETAIL g9/03.jpg",
    aspect: "square",
    partsInstalled: ["Ducktail Spoiler"],
    description: "Precision 3D molded curve matching OEM trunk gap tolerances.",
  },
  {
    id: "g6",
    title: "Accord G9 Ducktail Three-Quarter Rear Stance",
    category: "accord-g9",
    categoryLabel: "Accord G9",
    model: "Honda Accord G9",
    image: "/images/DETAIL g9/04.jpg",
    aspect: "square",
    partsInstalled: ["Ducktail Spoiler", "Emblem Delete"],
    description: "Muscular rear profile transforming the executive sedan silhouette.",
  },
  {
    id: "g7",
    title: "Accord G9 Ducktail Top-down Aerodynamic View",
    category: "accord-g9",
    categoryLabel: "Accord G9",
    model: "Honda Accord G9",
    image: "/images/DETAIL g9/05.jpg",
    aspect: "square",
    partsInstalled: ["Ducktail Spoiler"],
    description: "Smooth continuous airflow transition surface.",
  },
  {
    id: "g8",
    title: "South Aero CFD Aerodynamic Pressure Mapping",
    category: "aero-cfd",
    categoryLabel: "Aero CFD",
    model: "Computational Fluid Dynamics",
    image: "/images/G9/Artboard 8.png",
    aspect: "landscape",
    partsInstalled: ["CFD High-Speed Simulation", "Pressure Gradient Analysis"],
    description: "Full-vehicle CFD airflow velocity and pressure coefficient distribution.",
  },
  {
    id: "g9",
    title: "South Aero Airflow Vector Turbulence Simulation",
    category: "aero-cfd",
    categoryLabel: "Aero CFD",
    model: "Wind Tunnel Simulation",
    image: "/images/G9/Artboard 9.png",
    aspect: "landscape",
    partsInstalled: ["Aerodynamic Optimization", "Vortex Streamlines"],
    description: "Minimizing wake turbulence and eliminating rear axle high-speed lift.",
  },
  {
    id: "g10",
    title: "South Aero Aerodynamic Surface Engineering Analysis",
    category: "aero-cfd",
    categoryLabel: "Aero CFD",
    model: "R&D Simulation",
    image: "/images/G9/Artboard 10.png",
    aspect: "landscape",
    partsInstalled: ["Surface Pressure Heatmap"],
    description: "Visualizing downforce generation across front splitter and rear aero elements.",
  },
  {
    id: "g11",
    title: "Civic FD Track Aero Edition — Full Build",
    category: "civic-fd",
    categoryLabel: "Civic FD",
    model: "Honda Civic FD2 Type R Style",
    image: "/images/fd.png",
    aspect: "landscape",
    partsInstalled: ["Front Splitter Dam", "Track Diffuser", "Vented Skirts"],
    description: "Dedicated time-attack and street aero kit for the legendary FD chassis.",
  },
  {
    id: "g12",
    title: "Civic FE 11th Gen — Street Aerodynamic Package",
    category: "civic-fe",
    categoryLabel: "Civic FE",
    model: "Honda Civic FE 1.5 Turbo",
    image: "/images/fe.png",
    aspect: "landscape",
    partsInstalled: ["FE Front Lip", "Side Skirts", "Rear Trunk Spoiler"],
    description: "Clean modern aerodynamic enhancement with OEM+ aesthetic.",
  },
  {
    id: "g13",
    title: "Civic Type R FL5 — Clubsport Carbon Package",
    category: "civic-fl5",
    categoryLabel: "Civic FL5",
    model: "Honda Civic Type R FL5",
    image: "/images/civic-r.jpg",
    aspect: "landscape",
    partsInstalled: ["Swan Neck Wing", "Carbon Canards", "Underbody Strakes"],
    description: "Track-focused high-downforce aerodynamic package for Honda FL5.",
  },
  {
    id: "g14",
    title: "Accord G9 Full Body Kit 02 Studio Renders",
    category: "accord-g9",
    categoryLabel: "Accord G9",
    model: "Honda Accord G9",
    image: "/images/AS.png",
    aspect: "landscape",
    partsInstalled: ["Full Body Kit 02 Package"],
    description: "Complete side profile showcase with flush fitment.",
  },
  {
    id: "g15",
    title: "South Aero Brand Identity & Racing Philosophy",
    category: "brand",
    categoryLabel: "South Aero",
    model: "Not Loud, Just Different.",
    image: "/images/SOUTH IG/Artboard 1.png",
    aspect: "square",
    partsInstalled: ["Official Merchandise", "Design Identity"],
    description: "Functional aerodynamic performance built for motorsport enthusiasts.",
  },
  {
    id: "g16",
    title: "Accord G9 Track Racer Aerodynamic Spec",
    category: "accord-g9",
    categoryLabel: "Accord G9",
    model: "Honda Accord G9 Clubsport",
    image: "/images/top-racer.jpg",
    aspect: "landscape",
    partsInstalled: ["Wide Splitter", "Track Ducktail", "Forged Wheels"],
    description: "Real-world testing on dynamic proving grounds.",
  },
];
