export interface ProductVariant {
  name: string;
  price: number;
}

export interface OptionChoice {
  name: string;
  additionalPrice?: number;
}

export interface ProductOption {
  name: string;
  required: boolean;
  choices: OptionChoice[];
}

export interface MenuItem {
  id: number;
  name: string;
  category: string;
  image: string;
  price: number; // Default base price
  originalPrice: number | null;
  available: number;
  sold: number;
  discount: number | null;
  unit: string;
  variants?: ProductVariant[];
  options?: ProductOption[];
}

export interface SelectedOptions {
  [optionName: string]: string;
}

export interface CartItem {
  id: string;
  productId: number;
  name: string;
  category: string;
  image: string;
  basePrice: number; 
  price: number; // Calculated unit price including variant/options
  quantity: number;
  variant?: string;
  options?: SelectedOptions;
}
