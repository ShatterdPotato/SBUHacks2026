import type {jsPDF} from 'jspdf';
import type {Take} from './interview-types';
export function createInterviewPdf(data:{role:string;answers:Take[];aiReport?:unknown;practiceDrills?:unknown;clipFeedback?:unknown;moments?:unknown;createdAt?:string},options?:{fonts:string[]}):Promise<jsPDF>;
