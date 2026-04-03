import React, { useState } from "react";
import { X } from "lucide-react";
import clsx from "clsx";
// 1. Importamos la interfaz correcta desde la store 🌟
import type { SelectedVariant } from "../store/cartStore";

interface Variant {
  id: string;
  name: string;
  price: number;
}

// 2. BORRAMOS la interfaz duplicada de SelectedVariant que estaba aquí 🗑️

interface ModalCustomizationProps {
  isOpen: boolean;
  onClose: () => void;
  item: any;
  onSave: (
    productId: string,
    newNotes: string,
    newVariants: SelectedVariant[], // 3. Esto ahora usará la interfaz de la store
  ) => void;
}

export default function ModalCustomization({
  isOpen,
  onClose,
  item,
  onSave,
}: ModalCustomizationProps) {
  const [notes, setNotes] = useState<string>(item?.notes || "");
  const [selectedVariants, setSelectedVariants] = useState<SelectedVariant[]>(
    item?.variants || [],
  );

  if (!isOpen || !item) return null;

  const availableVariants: Variant[] = [
    { id: "v1", name: "Extra Rice", price: 0.0 },
    { id: "v2", name: "Double Meat", price: 5.0 },
    { id: "v3", name: "No Onions", price: 0.0 },
  ];

  const toggleVariant = (variant: Variant) => {
    // 4. Cambiamos variant_id por variantId 🌟
    const exists = selectedVariants.find((v) => v.variantId === variant.id);

    if (exists) {
      setSelectedVariants(
        selectedVariants.filter((v) => v.variantId !== variant.id),
      );
    } else {
      setSelectedVariants([
        ...selectedVariants,
        {
          // 5. Mapeamos las propiedades usando camelCase para que coincidan 🌟
          variantId: variant.id,
          variantName: variant.name,
          priceModifier: variant.price,
        },
      ]);
    }
  };

  const handleSave = () => {
    onSave(item.temporal_id, notes, selectedVariants);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-md p-6 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            Customize: {item.product_name}
          </h2>
          <button
            onClick={onClose}
            className="text-dark-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Quick Variants Selection */}
        <div className="mb-6">
          <p className="text-sm font-bold text-dark-400 uppercase tracking-wider mb-3">
            Quick Options
          </p>
          <div className="flex flex-wrap gap-2">
            {availableVariants.map((variant) => {
              // 6. Cambiamos sv.variant_id por sv.variantId 🌟
              const isActive = selectedVariants.some(
                (sv) => sv.variantId === variant.id,
              );

              return (
                <button
                  key={variant.id}
                  onClick={() => toggleVariant(variant)}
                  className={clsx(
                    "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                    isActive
                      ? "bg-brand-600 text-white"
                      : "bg-dark-700 text-dark-300 hover:bg-dark-600",
                  )}
                >
                  {variant.name}
                  {variant.price > 0 ? ` (+$${variant.price.toFixed(2)})` : ""}
                </button>
              );
            })}
          </div>
        </div>

        {/* Free Text Notes */}
        <div className="mb-6">
          <label className="text-sm font-bold text-dark-400 uppercase tracking-wider block mb-3">
            Special Instructions
          </label>
          <textarea
            className="input-field min-h-[100px] py-3 resize-none"
            placeholder="Ex: No onions, well done, extra sauce..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 btn-secondary">
            Cancel
          </button>
          <button onClick={handleSave} className="flex-1 btn-success">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
