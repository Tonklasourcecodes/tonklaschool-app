export const APPROVERS = [
  "บุญเอนก มณีธรรม (บุญเอนก)",
  "นวพรรษ อาวิพันธุ์ (ตูน)",
  "กนกวรรณ์ โปธิปัน (อ้อ)",
] as const;

export type Approver = (typeof APPROVERS)[number];
