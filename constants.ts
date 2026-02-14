
import { School } from './types';

export const SCHOOL_BRANCHES: string[] = [
  "AMBALA",
  "AMRITSAR",
  "BHUBANESWAR",
  "CALI, COLOMBIA",
  "DASUYA",
  "DELHI",
  "DEVLALI",
  "FEROZEPUR",
  "HISAR",
  "JAGDISHPURA",
  "JALANDHAR",
  "KAITHAL",
  "KALKA",
  "LUCKNOW",
  "LUDHIANA",
  "MEERUT",
  "MODASA",
  "PUNE",
  "RATHONDA",
  "SUNDARGARH",
  "GULARIA BHAT",
  "BIGAS",
  "JANSATH"
];

export const SCHOOLS: School[] = SCHOOL_BRANCHES.map(name => ({
  id: name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(),
  name: name
}));

export const DEFAULT_CATEGORIES = [
  "Arts and Craft",
  "IT Equipment",
  "Science Lab",
  "Sports",
  "Stationery",
  "Furniture",
  "Library"
];

// Head Office Store Specifics
export const HO_STORE_ID = 'HO_CENTRAL_STORE';
export const HO_STORE_CATEGORIES = ['Books', 'Stationery'];

export const HEAD_OFFICE_CREDENTIALS = {
  username: "DEF",
  password: "DEF@123"
};

export const CENTRAL_STORE_CREDENTIALS = {
  username: "STORE",
  password: "STORE@123"
};

export const MASTER_PASSWORD = "Shubham@123";

export const FINANCIAL_YEARS = [
  "2020-2021",
  "2021-2022",
  "2022-2023",
  "2023-2024",
  "2024-2025",
  "2025-2026",
  "2026-2027",
  "2027-2028",
  "2028-2029",
  "2029-2030",
  "2030-2031"
];

export const getCurrentFinancialYear = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-11. April is 3.
  if (month >= 3) {
    return `${year}-${year + 1}`;
  } else {
    return `${year - 1}-${year}`;
  }
};