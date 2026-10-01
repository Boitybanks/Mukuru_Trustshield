import type { DemoStatus } from './officialRegistry';

export interface OfficialLocation {
  id: string;
  name: string;
  /** Full address exactly as published by Mukuru. */
  address: string;
  city: string;
  suburb?: string;
  province: string;
  type: 'BRANCH' | 'BOOTH' | 'CUSTOMER_SERVICE_OFFICE' | 'HEAD_OFFICE';
  /**
   * Each key is one way of naming the place (street, building or mall).
   * A match needs ALL distinctive tokens of one key plus agreement on the
   * town or suburb. Street-type words ("Street", "Rd") are optional.
   */
  matchKeys: string[];
  /** Street number, when published, so "12 Bree St" never matches "21 Bree St". */
  streetNumber?: string;
  source: string;
  verifiedAt: string;
  demoStatus: DemoStatus;
}

const VERIFIED_AT = '2026-10-01';

/**
 * Mukuru-run locations taken from Mukuru's own store locator
 * (https://www.mukuru.com/sa/find-us/ → per-store pages). Retail partner
 * pay-points are deliberately excluded. Hours change; addresses were current
 * on the verification date.
 */
export const OFFICIAL_LOCATIONS: readonly OfficialLocation[] = [
  {
    id: 'jhb-braamfontein-branch',
    name: 'Mukuru Branch Braamfontein',
    address: 'J-One Student Accommodation, Cnr 1 Leyds Street & Biccard St, Braamfontein, Johannesburg 2001',
    city: 'Johannesburg',
    suburb: 'Braamfontein',
    province: 'Gauteng',
    type: 'BRANCH',
    matchKeys: ['J-One', 'Leyds Biccard'],
    source: 'https://www.mukuru.com/sa/stores/mukuru-branch-braamfontein/',
    verifiedAt: VERIFIED_AT,
    demoStatus: 'PUBLIC_MUKURU_SOURCE',
  },
  {
    id: 'jhb-braamfontein-booth',
    name: 'Mukuru Booth Braamfontein',
    address: '11 Leyds Street, Braamfontein, Johannesburg 2017',
    city: 'Johannesburg',
    suburb: 'Braamfontein',
    province: 'Gauteng',
    type: 'BOOTH',
    matchKeys: ['Leyds Street'],
    streetNumber: '11',
    source: 'https://www.mukuru.com/sa/stores/mukuru-booth-braamfontein/',
    verifiedAt: VERIFIED_AT,
    demoStatus: 'PUBLIC_MUKURU_SOURCE',
  },
  {
    id: 'jhb-hillbrow-branch',
    name: 'Mukuru Branch Hillbrow',
    address: 'Shop 2 Highpoint Shopping Mall, c/o Klein & Kotze Streets, Hillbrow, Johannesburg 2001',
    city: 'Johannesburg',
    suburb: 'Hillbrow',
    province: 'Gauteng',
    type: 'BRANCH',
    matchKeys: ['Highpoint', 'Klein Kotze'],
    source: 'https://www.mukuru.com/sa/stores/mukuru-branch-hillbrow/',
    verifiedAt: VERIFIED_AT,
    demoStatus: 'PUBLIC_MUKURU_SOURCE',
  },
  {
    id: 'jhb-yeoville-branch',
    name: 'Mukuru Branch Yeoville',
    address: 'Picadilly Mall Shop S12, 12 Rockey Street, Yeoville, Johannesburg 2198',
    city: 'Johannesburg',
    suburb: 'Yeoville',
    province: 'Gauteng',
    type: 'BRANCH',
    matchKeys: ['Picadilly Mall', 'Rockey Street'],
    streetNumber: '12',
    source: 'https://www.mukuru.com/sa/stores/mukuru-branch-yeoville/',
    verifiedAt: VERIFIED_AT,
    demoStatus: 'PUBLIC_MUKURU_SOURCE',
  },
  {
    id: 'cpt-long-market-branch',
    name: 'Mukuru Branch Long Market',
    address: 'Shop G7, 102 Longmarket St, Cape Town City Centre (c/o Parliament & Longmarket Streets), Cape Town 8000',
    city: 'Cape Town',
    suburb: 'City Centre',
    province: 'Western Cape',
    type: 'BRANCH',
    matchKeys: ['Longmarket Street', 'Long Market Street', 'Parliament Longmarket'],
    streetNumber: '102',
    source: 'https://www.mukuru.com/sa/stores/mukuru-branch-long-market/',
    verifiedAt: VERIFIED_AT,
    demoStatus: 'PUBLIC_MUKURU_SOURCE',
  },
  {
    id: 'cpt-wynberg-branch',
    name: 'Mukuru Branch Wynberg',
    address: 'Grand Central Building, 227 Main Road, Wynberg, Cape Town 7700',
    city: 'Cape Town',
    suburb: 'Wynberg',
    province: 'Western Cape',
    type: 'BRANCH',
    matchKeys: ['Grand Central', '227 Main Road'],
    streetNumber: '227',
    source: 'https://www.mukuru.com/sa/stores/mukuru-branch-wynberg/',
    verifiedAt: VERIFIED_AT,
    demoStatus: 'PUBLIC_MUKURU_SOURCE',
  },
  {
    id: 'dbn-the-wheel-branch',
    name: 'Mukuru Branch The Wheel',
    address: '530 Mahatma Gandhi Rd, Durban 4001',
    city: 'Durban',
    province: 'KwaZulu-Natal',
    type: 'BRANCH',
    matchKeys: ['The Wheel', 'Mahatma Gandhi'],
    streetNumber: '530',
    source: 'https://www.mukuru.com/sa/stores/mukuru-branch-the-wheel/',
    verifiedAt: VERIFIED_AT,
    demoStatus: 'PUBLIC_MUKURU_SOURCE',
  },
  {
    id: 'dbn-albert-office',
    name: 'Mukuru Customer Service Office Albert',
    address: '37 Ingcuce Rd, Durban Central, Durban 4001',
    city: 'Durban',
    suburb: 'Durban Central',
    province: 'KwaZulu-Natal',
    type: 'CUSTOMER_SERVICE_OFFICE',
    matchKeys: ['Ingcuce'],
    streetNumber: '37',
    source: 'https://www.mukuru.com/sa/stores/mukuru-information-office-albert-street/',
    verifiedAt: VERIFIED_AT,
    demoStatus: 'PUBLIC_MUKURU_SOURCE',
  },
  {
    id: 'pta-sunnyside-branch',
    name: 'Mukuru Branch Sunnyside',
    address: 'Shop No. 9 Adverto Towers, 252 Robert Sobukwe Street, Sunnyside, Pretoria 0002',
    city: 'Pretoria',
    suburb: 'Sunnyside',
    province: 'Gauteng',
    type: 'BRANCH',
    matchKeys: ['Adverto Towers', 'Robert Sobukwe'],
    streetNumber: '252',
    source: 'https://www.mukuru.com/sa/stores/mukuru-branch-sunnyside/',
    verifiedAt: VERIFIED_AT,
    demoStatus: 'PUBLIC_MUKURU_SOURCE',
  },
  {
    id: 'pta-bosman-branch',
    name: 'Mukuru Branch Bosman',
    address: 'Shop 29 Station Square, 149 Jeff Masemola Street, Pretoria 0001',
    city: 'Pretoria',
    province: 'Gauteng',
    type: 'BRANCH',
    matchKeys: ['Jeff Masemola', 'Bosman'],
    streetNumber: '149',
    source: 'https://www.mukuru.com/sa/stores/mukuru-branch-bosman/',
    verifiedAt: VERIFIED_AT,
    demoStatus: 'PUBLIC_MUKURU_SOURCE',
  },
  {
    id: 'cpt-head-office',
    name: 'Mukuru Head Office',
    address: 'Building 20, The Waverley Business Park, Wyecroft Road, Observatory, Cape Town',
    city: 'Cape Town',
    suburb: 'Observatory',
    province: 'Western Cape',
    type: 'HEAD_OFFICE',
    matchKeys: ['Waverley Business Park', 'Wyecroft'],
    source: 'https://www.mukuru.com/sa/',
    verifiedAt: VERIFIED_AT,
    demoStatus: 'PUBLIC_MUKURU_SOURCE',
  },
];
