import type { Request, Response, NextFunction } from 'express';
import { CustomError } from './error-handler.js';

export interface ValidationSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'array';
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: RegExp;
    enum?: any[];
  };
}

export const validateRequest = (schema: ValidationSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const data = { ...req.body, ...req.query, ...req.params };
    const errors: Record<string, string> = {};

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];

      // Check required
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors[field] = `${field} là bắt buộc`;
        continue;
      }

      if (value === undefined || value === null) continue;

      // Check type
      if (rules.type === 'string' && typeof value !== 'string') {
        errors[field] = `${field} phải là string`;
        continue;
      }

      if (rules.type === 'number' && typeof value !== 'number') {
        errors[field] = `${field} phải là số`;
        continue;
      }

      // String validations
      if (typeof value === 'string') {
        if (rules.minLength && value.length < rules.minLength) {
          errors[field] = `${field} phải ít nhất ${rules.minLength} ký tự`;
        }
        if (rules.maxLength && value.length > rules.maxLength) {
          errors[field] = `${field} không được quá ${rules.maxLength} ký tự`;
        }
        if (rules.pattern && !rules.pattern.test(value)) {
          errors[field] = `${field} định dạng không hợp lệ`;
        }
      }

      // Number validations
      if (typeof value === 'number') {
        if (rules.min !== undefined && value < rules.min) {
          errors[field] = `${field} phải >= ${rules.min}`;
        }
        if (rules.max !== undefined && value > rules.max) {
          errors[field] = `${field} phải <= ${rules.max}`;
        }
      }

      // Enum check
      if (rules.enum && !rules.enum.includes(value)) {
        errors[field] = `${field} phải là một trong: ${rules.enum.join(', ')}`;
      }
    }

    if (Object.keys(errors).length > 0) {
      throw new CustomError(
        `Validation failed: ${Object.entries(errors).map(([k, v]) => `${k}: ${v}`).join('; ')}`,
        400,
        'VALIDATION_ERROR'
      );
    }

    next();
  };
};
