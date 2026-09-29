/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { FileDescriptor } from './IFilePickerService.ts';

export function createSampleSalesXlsx(): FileDescriptor {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Q1
  const q1Data = [
    { OrderID: 'ORD-101', Date: '2026-01-15', Customer: 'Acme Corp', Product: 'Widget A', Region: 'North', Units: 120, UnitPrice: 15.5, TotalAmount: 1860.0, Discount: 0.05, Status: 'Delivered', Rep: 'Alice', Priority: 'High' },
    { OrderID: 'ORD-102', Date: '2026-01-20', Customer: 'Globex Ltd', Product: 'Gadget Pro', Region: 'West', Units: 85, UnitPrice: 42.0, TotalAmount: 3570.0, Discount: 0.1, Status: 'Delivered', Rep: 'Bob', Priority: 'Medium' },
    { OrderID: 'ORD-103', Date: '2026-02-04', Customer: 'Initech', Product: 'Sensor X', Region: 'South', Units: 240, UnitPrice: 8.75, TotalAmount: 2100.0, Discount: 0.0, Status: 'Pending', Rep: 'Charlie', Priority: 'Normal' },
    { OrderID: 'ORD-104', Date: '2026-02-18', Customer: 'Soylent Inc', Product: 'Widget B', Region: 'East', Units: 60, UnitPrice: 22.0, TotalAmount: 1320.0, Discount: 0.0, Status: 'Delivered', Rep: 'Alice', Priority: 'Low' },
    { OrderID: 'ORD-105', Date: '2026-03-11', Customer: 'Umbrella Co', Product: 'Module 9', Region: 'North', Units: 310, UnitPrice: 11.2, TotalAmount: 3472.0, Discount: 0.15, Status: 'Processing', Rep: 'Diana', Priority: 'High' },
  ];
  // Replicate to simulate a substantial sheet
  const expandedQ1: typeof q1Data = [];
  for (let i = 0; i < 240; i++) {
    for (const item of q1Data) {
      expandedQ1.push({
        ...item,
        OrderID: `ORD-${1000 + expandedQ1.length}`,
        Units: item.Units + (i % 10),
        TotalAmount: (item.Units + (i % 10)) * item.UnitPrice,
      });
      if (expandedQ1.length >= 1204) break;
    }
    if (expandedQ1.length >= 1204) break;
  }
  const wsQ1 = XLSX.utils.json_to_sheet(expandedQ1);
  XLSX.utils.book_append_sheet(wb, wsQ1, 'Q1');

  // Sheet 2: Q2
  const q2Data = [
    { OrderID: 'ORD-201', Date: '2026-04-10', Customer: 'Hooli', Product: 'Widget A', Region: 'West', Units: 140, UnitPrice: 15.5, TotalAmount: 2170.0, Discount: 0.05, Status: 'Delivered', Rep: 'Bob', Priority: 'Medium' },
    { OrderID: 'ORD-202', Date: '2026-05-12', Customer: 'Pied Piper', Product: 'Compressor', Region: 'North', Units: 50, UnitPrice: 120.0, TotalAmount: 6000.0, Discount: 0.1, Status: 'Delivered', Rep: 'Alice', Priority: 'Urgent' },
  ];
  const expandedQ2: typeof q2Data = [];
  for (let i = 0; i < 490; i++) {
    for (const item of q2Data) {
      expandedQ2.push({
        ...item,
        OrderID: `ORD-${2000 + expandedQ2.length}`,
        Units: item.Units + (i % 8),
        TotalAmount: (item.Units + (i % 8)) * item.UnitPrice,
      });
      if (expandedQ2.length >= 980) break;
    }
    if (expandedQ2.length >= 980) break;
  }
  const wsQ2 = XLSX.utils.json_to_sheet(expandedQ2);
  XLSX.utils.book_append_sheet(wb, wsQ2, 'Q2');

  // Sheet 3: Summary
  const summaryData = [
    { Quarter: 'Q1', TotalRevenue: 124500.5, OrdersCount: 1204, TopRegion: 'North', AvgDiscount: 0.06, GrowthRate: 0.14 },
    { Quarter: 'Q2', TotalRevenue: 142800.0, OrdersCount: 980, TopRegion: 'West', AvgDiscount: 0.05, GrowthRate: 0.18 },
  ];
  const expandedSummary: typeof summaryData = [];
  for (let i = 0; i < 23; i++) {
    for (const item of summaryData) {
      expandedSummary.push({
        ...item,
        Quarter: `${item.Quarter}-Subgroup-${expandedSummary.length + 1}`,
      });
      if (expandedSummary.length >= 45) break;
    }
    if (expandedSummary.length >= 45) break;
  }
  const wsSummary = XLSX.utils.json_to_sheet(expandedSummary);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  const arrayBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;

  return {
    name: 'Sales.xlsx',
    path: 'C:\\Users\\Daniel\\Documents\\Sales.xlsx',
    buffer: arrayBuffer,
    source: 'browser-picker',
  };
}

export function createSampleInventoryCsv(): FileDescriptor {
  const csvContent = `SKU,ItemName,Category,StockQuantity,ReorderLevel,WarehouseLocation,LastRestockDate,UnitCost
SKU-9901,Steel Bracket,Hardware,450,100,Aisle-3-Bay-2,2026-08-10,4.25
SKU-9902,Copper Tube 2m,Plumbing,120,40,Aisle-1-Bay-4,2026-08-14,18.90
SKU-9903,Nylon Lock Nut,Fasteners,2500,500,Aisle-5-Bay-1,2026-08-20,0.15
SKU-9904,Digital Caliper,Tools,85,25,Aisle-2-Bay-6,2026-09-01,34.50
SKU-9905,Safety Goggles,Safety,340,75,Aisle-4-Bay-3,2026-09-05,6.75
SKU-9906,Hydraulic Oil 5L,Lubricants,95,30,Aisle-6-Bay-2,2026-09-12,28.00
SKU-9907,Thermal Paste,Electronics,210,50,Aisle-2-Bay-1,2026-09-15,8.20`;

  const encoder = new TextEncoder();
  const buffer = encoder.encode(csvContent).buffer;

  return {
    name: 'Inventory.csv',
    path: 'C:\\Users\\Daniel\\Documents\\Inventory.csv',
    buffer,
    source: 'browser-picker',
  };
}

export function createEmptySampleFile(): FileDescriptor {
  const encoder = new TextEncoder();
  const buffer = encoder.encode('').buffer;
  return {
    name: 'EmptyData.csv',
    path: 'C:\\Users\\Daniel\\Documents\\EmptyData.csv',
    buffer,
    source: 'browser-picker',
  };
}

export function createCorruptSampleFile(): FileDescriptor {
  const encoder = new TextEncoder();
  // Invalid header / corrupt bytes pretending to be an xlsx
  const buffer = encoder.encode('PK\x03\x04CORRUPTED_BYTES_HEADER_FAILURE').buffer;
  return {
    name: 'Corrupted.xlsx',
    path: 'C:\\Users\\Daniel\\Documents\\Corrupted.xlsx',
    buffer,
    source: 'browser-picker',
  };
}

export function createUnsupportedSampleFile(): FileDescriptor {
  const encoder = new TextEncoder();
  const buffer = encoder.encode('Report PDF Content').buffer;
  return {
    name: 'Financials.pdf',
    path: 'C:\\Users\\Daniel\\Documents\\Financials.pdf',
    buffer,
    source: 'browser-picker',
  };
}
