// Mock data for UI development — replace with database queries later

export type MockProduct = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  categorySlug: string;
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
  installation: string;
  weightKg: string;
  downforceN?: number;
  dragN?: number;
  downforceBefore?: number;
  downforceAfter?: number;
  dragBefore?: number;
  dragAfter?: number;
  imageCount: number;
  imagePlaceholders: string[];
  features: {
    title: string;
    description: string;
  }[];
};

export const MOCK_PRODUCTS: MockProduct[] = [
  {
    id: "1",
    slug: "ducktail-spoiler-accord-g9",
    name: "Ducktail Spoiler",
    brand: "South Aero",
    categorySlug: "spoilers",
    price: "5990.00",
    description:
      "Elevate the stance and performance of your vehicle with this aggressively styled, integrated ducktail spoiler. Engineered specifically to complement the widened profile of the Honda Accord G9, this custom-molded component perfectly balances race-inspired aesthetics with functional aerodynamic benefits.",
    shortDescription:
      "Sleek, aggressive, and precision-engineered. Designed to elevate the rear profile of your Accord with a performance-inspired edge.",
    compatibility: [{ make: "Honda", model: "Accord G9", yearFrom: 2013, yearTo: 2017 }],
    material: "ABS Plastic",
    finish: "Gloss Black",
    installation: "3M Tape / Screw-on",
    weightKg: "1.2",
    downforceN: 155,
    dragN: -4,
    downforceBefore: 89.51,
    downforceAfter: 66.06,
    dragBefore: 886.37,
    dragAfter: 882.77,
    imageCount: 5,
    imagePlaceholders: [
      "Ducktail Spoiler — Rear View",
      "Ducktail Spoiler — Side Angle",
      "Ducktail Spoiler — Close-up Detail",
      "Ducktail Spoiler — Installed on White Accord",
      "Ducktail Spoiler — Package Contents",
    ],
    features: [
      {
        title: "High-Speed Downforce Generation",
        description:
          "The pronounced upward sweep of the ducktail is specifically angled to intercept airflow traveling over the roofline.",
      },
      {
        title: "Reduced Lift & Improved Traction",
        description:
          "Generating substantial downforce to push the rear tires into the pavement for maximum grip.",
      },
      {
        title: "Superior Stability",
        description:
          "By reducing factory rear-end lift (aerodynamic lift), the ducktail ensures the rear of the vehicle remains firmly planted.",
      },
      {
        title: "Seamless Integration",
        description:
          "Sculpted to flow naturally into the aggressive lines of the wider rear quarter panels for a cohesive, muscular look.",
      },
    ],
  },
  {
    id: "2",
    slug: "carbon-fiber-front-lip-accord-g9",
    name: "Carbon Fiber Front Lip",
    brand: "South Aero",
    categorySlug: "body-kits",
    price: "4590.00",
    description:
      "Aggressive front lip designed to complement the South Aero body kit. Crafted from high-quality carbon fiber for lightweight strength and premium appearance.",
    shortDescription: "High-quality carbon fiber front lip for the Honda Accord G9 body kit.",
    compatibility: [{ make: "Honda", model: "Accord G9", yearFrom: 2013, yearTo: 2017 }],
    material: "Carbon Fiber",
    finish: "Carbon Weave / Gloss Clear Coat",
    installation: "Bolt-on / 3M Tape",
    weightKg: "2.1",
    imageCount: 4,
    imagePlaceholders: [
      "Carbon Fiber Front Lip — Front View",
      "Carbon Fiber Front Lip — Side View",
      "Carbon Fiber Front Lip — Detail",
      "Carbon Fiber Front Lip — Installed",
    ],
    features: [
      { title: "Lightweight Carbon Fiber", description: "Premium carbon fiber construction for maximum strength-to-weight ratio." },
      { title: "Aerodynamic Design", description: "Optimized shape to reduce front lift and improve high-speed stability." },
    ],
  },
  {
    id: "3",
    slug: "carbon-fiber-side-skirts-accord-g9",
    name: "Carbon Fiber Side Skirts",
    brand: "South Aero",
    categorySlug: "body-kits",
    price: "5190.00",
    description:
      "Precision-engineered side skirts that flow seamlessly from the front lip to the rear diffuser. Reduces side turbulence and completes the aggressive profile.",
    shortDescription: "Precision-engineered carbon fiber side skirts for the Accord G9.",
    compatibility: [{ make: "Honda", model: "Accord G9", yearFrom: 2013, yearTo: 2017 }],
    material: "Carbon Fiber",
    finish: "Carbon Weave / Gloss Clear Coat",
    installation: "Bolt-on / 3M Tape",
    weightKg: "3.4",
    imageCount: 4,
    imagePlaceholders: [
      "Side Skirts — Side View",
      "Side Skirts — Installed",
      "Side Skirts — Close-up",
      "Side Skirts — Pair",
    ],
    features: [
      { title: "Aerodynamic Flow", description: "Designed to manage airflow along the vehicle sides, reducing turbulence." },
      { title: "Perfect Fitment", description: "Precision-molded for the Accord G9 body lines." },
    ],
  },
  {
    id: "4",
    slug: "carbon-fiber-rear-diffuser-accord-g9",
    name: "Carbon Fiber Rear Diffuser",
    brand: "South Aero",
    categorySlug: "body-kits",
    price: "6990.00",
    description:
      "Aggressive rear diffuser designed to accelerate airflow under the car, creating a low-pressure zone that generates additional downforce at the rear.",
    shortDescription: "Carbon fiber rear diffuser for enhanced rear aerodynamics.",
    compatibility: [{ make: "Honda", model: "Accord G9", yearFrom: 2013, yearTo: 2017 }],
    material: "Carbon Fiber",
    finish: "Carbon Weave / Gloss Clear Coat",
    installation: "Bolt-on",
    weightKg: "2.8",
    imageCount: 4,
    imagePlaceholders: [
      "Rear Diffuser — Rear View",
      "Rear Diffuser — Under View",
      "Rear Diffuser — Installed",
      "Rear Diffuser — Detail",
    ],
    features: [
      { title: "Downforce Generation", description: "Creates a low-pressure zone under the car for enhanced rear grip." },
      { title: "Race-Inspired Design", description: "Aggressive fin design inspired by professional motorsport." },
    ],
  },
];

export const VEHICLE_MAKES = [
  { value: "honda", label: "Honda", logo: "H" },
  { value: "toyota", label: "Toyota", logo: "T" },
  { value: "isuzu", label: "ISUZU", logo: "I" },
  { value: "mitsubishi", label: "Mitsubishi", logo: "M" },
];

export const VEHICLE_MODELS: Record<string, { value: string; label: string }[]> = {
  honda: [
    { value: "accord-g9", label: "Accord G9" },
    { value: "civic-fd", label: "Civic FD" },
    { value: "civic-fe", label: "Civic FE" },
    { value: "civic-fl5", label: "Civic FL5" },
  ],
  toyota: [
    { value: "camry", label: "Camry" },
    { value: "corolla-altis", label: "Corolla Altis" },
  ],
  isuzu: [
    { value: "d-max", label: "D-Max" },
  ],
  mitsubishi: [
    { value: "lancer", label: "Lancer" },
  ],
};

export type CartItem = {
  id: string;
  product: MockProduct;
  quantity: number;
  variant: string;
};

export const FEATURED_BODY_KIT = {
  name: "Accord G9 Body Kit",
  version: "02",
  description: "Precision engineered to elevate the stance and performance of your Accord G9. Aerodynamic, functional, and built to stand out.",
  designer: "South Aero",
};

export const CATEGORY_TABS = [
  { id: "shop", label: "SHOP" },
  { id: "g9", label: "G9" },
  { id: "gallery", label: "GALLERY" },
];

export const PRODUCT_CATEGORIES = [
  { slug: "front-lip", name: "FRONT LIP", placeholder: "Front Lip — Product Image" },
  { slug: "side-skirt", name: "SIDE SKIRT", placeholder: "Side Skirt — Product Image" },
  { slug: "rear-diffuser", name: "REAR DIFFUSER", placeholder: "Rear Diffuser — Product Image" },
  { slug: "ducktail-spoiler", name: "DUCKTAIL SPOILER", placeholder: "Ducktail Spoiler — Product Image" },
];
