export interface Supplier {
  code: string;
  prefix: string;
  name: string;
  productOrService: string;
  category: string;
  details: string;
  contact1Name: string;
  phone1: string;
  contact2Name: string;
  phone2: string;
  lineId: string;
  buildingName: string;
  houseNo: string;
  moo: string;
  soi: string;
  road: string;
  tambon: string;
  amphoe: string;
  province: string;
  zipcode: string;
  fullAddress: string;
  orderCount: string;
  blacklist: string;
  blacklistReason: string;
}

export interface Item {
  code: string;
  name: string;
  supplierName: string;
  unit: string;
  price: string;
  isServiceFee: string;
  vat: string;
  priceExclVat: string;
  vatPerUnit: string;
  priceInclVat: string;
  supplierSku: string;
  note: string;
}

// 5.PO — 26 columns (A-Z)
export interface PO {
  poNumber: string;         // A เลขที่ใบสั่งซื้อ
  orderDate: string;        // B วันที่สั่งซื้อ
  prevPO: string;           // C PO เดิม
  supplierName: string;     // D ชื่อร้านค้า/บุคคล/บริษัท
  requester: string;        // E ชื่อผู้สั่งซื้อ
  subtotal: string;         // F ยอดสั่งซื้อ
  deposit: string;          // G ค่ามัดจำ
  shipping: string;         // H ค่าขนส่ง
  discount: string;         // I ส่วนลด
  grandTotal: string;       // J รวมเป็นเงิน
  reviewer: string;         // K ชื่อผู้ตรวจสอบ
  approver: string;         // L ชื่อผู้อนุมัติ
  approvalDate: string;     // M วันที่อนุมัติ
  approvalStatus: string;   // N สถานะอนุมัติ
  paymentDate: string;      // O วันที่ชำระ
  paymentMethod: string;    // P วิธีชำระเงิน
  notes: string;            // Q หมายเหตุการสั่งซื้อ
  receivingDate: string;    // R วันที่ตรวจรับของ
  receiver1: string;        // S กรรมการตรวจรับของ1
  receiver2: string;        // T กรรมการตรวจรับของ2
  receiver3: string;        // U กรรมการตรวจรับของ3
  quality: string;          // V คุณภาพของ
  qualityDetails: string;   // W รายละเอียดการตรวจคุณภาพของ
  fullCount: string;        // X ครบจำนวน
  fullCountDetails: string; // Y รายละเอียดครบจำนวน
  receivingStatus: string;  // Z สถานะตรวจรับของ
}

export type NewPOLineItemInput = {
  itemCode: string;
  itemName: string;
  supplierSku: string;
  qty: string;
  unit: string;
  priceExclVat: string;
  vatPct: string;
  itemNote: string;
};

export type NewPOInput = {
  orderDate: string;
  prevPO: string;
  supplierName: string;
  requester: string;
  reviewer: string;
  approver: string;
  deposit: string;
  shipping: string;
  discount: string;
  notes: string;
  lineItems: NewPOLineItemInput[];
};

export type UpdatePOInput = {
  supplierName?: string;
  requester?: string;
  approver?: string;
  deposit?: string;
  shipping?: string;
  discount?: string;
  notes?: string;
  approvalStatus?: string;
  approvalDate?: string;
};

export type UpdateJOInput = {
  supplierName?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  deposit?: string;
  requester?: string;
  department?: string;
  approver?: string;
  notes?: string;
  approvalStatus?: string;
  approvalDate?: string;
};

// 10.JO_order line items
export interface JOOrder {
  lineIndex: string;    // A
  joNumber: string;     // B
  supplierName: string; // C (XLOOKUP)
  itemName: string;     // D ชื่องาน
  qty: string;          // E จำนวน
  unit: string;         // F หน่วย
  priceExcl: string;    // G ราคา/หน่วย (excl VAT)
  vatPct: string;       // H VAT%
  vatPerUnit: string;   // I (formula)
  priceIncl: string;    // J (formula)
  totalExcl: string;    // K (formula)
  totalVat: string;     // L (formula)
  totalIncl: string;    // M (formula)
  itemNote: string;     // N หมายเหตุ
}

export type NewJOOrderItem = {
  itemName: string;
  qty: string;
  unit: string;
  priceExcl: string;
  vatPct: string;
  itemNote?: string;
};

export interface POOrder {
  lineIndex: string;
  poNumber: string;
  supplierName: string;
  supplierSku: string;
  itemCode: string;
  itemName: string;
  qty: string;
  unit: string;
  priceExcl: string;
  vatPerUnit: string;
  priceIncl: string;
  totalExcl: string;
  totalVat: string;
  totalIncl: string;
  itemNote: string;
}

// 9.JO — 27 columns (A-AA)
export interface JO {
  joNumber: string;             // A เลขที่ใบสั่งจ้าง
  supplierName: string;         // B ชื่อร้านค้า/บุคคล/บริษัท
  startDate: string;            // C วันที่เริ่มงาน
  endDate: string;              // D วันที่สิ้นสุด
  location: string;             // E สถานที่
  deposit: string;              // F ค่ามัดจำ
  depositDate: string;          // G วันที่ชำระค่ามัดจำ
  requester: string;            // H ชื่อผู้จ้าง
  reviewer: string;             // I ชื่อผู้ตรวจสอบ
  department: string;           // J แผนกผู้สั่ง
  grandTotal: string;           // K รวมเป็นเงิน
  notes: string;                // L หมายเหตุการจ้าง
  approver: string;             // M ชื่อผู้อนุมัติ
  approvalDate: string;         // N วันที่อนุมัติ
  approvalStatus: string;       // O สถานะอนุมัติ
  receivingDate: string;        // P วันที่ตรวจรับงาน
  receiver1: string;            // Q กรรมการตรวจรับงาน1
  receiver2: string;            // R กรรมการตรวจรับงาน2
  receiver3: string;            // S กรรมการตรวจรับงาน3
  quality: string;              // T คุณภาพงาน
  qualityDetails: string;       // U รายละเอียดการตรวจคุณภาพงาน
  workCollection: string;       // V การเก็บงาน
  workCollectionDetails: string;// W รายละเอียดการเก็บงาน
  cleanliness: string;          // X ความสะอาด
  cleanlinessDetails: string;   // Y รายละเอียดความสะอาด
  receivingStatus: string;      // Z สถานะตรวจรับงาน
  paymentStatus: string;        // AA สถานะชำระเงิน
}

export type NewJOInput = {
  supplierName: string;
  startDate: string;
  endDate: string;
  location: string;
  deposit: string;
  requester: string;
  reviewer: string;
  department: string;
  approver: string;
  notes: string;
  lineItems: NewJOOrderItem[];
};
