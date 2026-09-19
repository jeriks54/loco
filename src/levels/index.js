/* ============================================================
   LoCo — level registry (design.md §2)
   Ordered list of all levels; later chapters append here.
   ============================================================ */

import { chapter1 } from './chapter1.js';
import { chapter2 } from './chapter2.js';
import { chapter3 } from './chapter3.js';
import { chapter4 } from './chapter4.js';

export const levels = [...chapter1, ...chapter2, ...chapter3, ...chapter4];
