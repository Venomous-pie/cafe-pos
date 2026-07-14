import { MenuItem, SelectedOptions } from "../types";

export function calculateItemPrice(
  product: MenuItem,
  selectedVariantName?: string,
  selectedOptions?: SelectedOptions
): number {
  let finalPrice = product.price;

  if (selectedVariantName && product.variants) {
    const variant = product.variants.find((v) => v.name === selectedVariantName);
    if (variant) {
      finalPrice = variant.price;
    }
  }

  if (selectedOptions && product.options) {
    for (const optionName of Object.keys(selectedOptions)) {
      const choiceName = selectedOptions[optionName];
      const optionDef = product.options.find((o) => o.name === optionName);
      if (optionDef) {
        const choiceDef = optionDef.choices.find((c) => c.name === choiceName);
        if (choiceDef && choiceDef.additionalPrice) {
          finalPrice += choiceDef.additionalPrice;
        }
      }
    }
  }

  return finalPrice;
}
