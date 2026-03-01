import React from 'react';
import { useEconomy } from '@/context/EconomyContext';
import { useLux } from '@/context/LuxContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Zap, Check } from 'lucide-react';

export const InventoryScreen: React.FC = () => {
  const { inventory, consume, storeItems } = useEconomy();
  const { user } = useLux();

  const handleConsume = async (itemId: string) => {
    const success = await consume(itemId);
    if (success) {
      // Optional: Add success notification or feedback here
      console.log('Item consumed successfully');
    }
  };

  if (!user) return null;

  return (
    <div className="p-6 text-white min-h-screen pb-24">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Inventory</h1>
        <p className="text-white/50">Manage your acquired assets and power-ups.</p>
      </header>

      {/* Equipped Items Section */}
      {user.equippedItems && Object.keys(user.equippedItems).length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Zap className="text-yellow-400" size={20} />
            Equipped
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(user.equippedItems).map(([slot, itemId]) => {
                // This usage of user.equippedItems[slot] or iterating entries triggers the index signature check
                const itemDetails = storeItems.find(i => i.id === itemId);
                return (
                    <div key={slot} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                            {/* Placeholder for item icon */}
                            <Check size={16} />
                        </div>
                        <div>
                            <div className="text-xs uppercase tracking-wider text-white/50">{slot}</div>
                            <div className="font-bold">{itemDetails?.name || itemId}</div>
                        </div>
                    </div>
                );
            })}
          </div>
        </section>
      )}

      {/* Inventory Items Section */}
      <section>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Package className="text-blue-400" size={20} />
          Stash ({inventory.length})
        </h2>
        
        {inventory.length === 0 ? (
          <div className="text-center py-12 text-white/30 bg-white/5 rounded-3xl border border-dashed border-white/10">
            No items in inventory. Visit the Store.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {inventory.map((item) => {
                const storeItem = storeItems.find(si => si.id === item.itemId);
                if (!storeItem) return null;

                return (
                  <motion.div
                    key={item.itemId}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-white/5 border border-white/10 p-4 rounded-3xl flex items-center justify-between group backdrop-blur-sm shadow-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
                        {/* Dynamic Icon could go here */}
                        <Package size={20} className="text-white/80" />
                      </div>
                      <div>
                        <h3 className="font-bold">{storeItem.name}</h3>
                        <p className="text-xs text-white/50">{storeItem.description}</p>
                        <div className="mt-1 text-xs font-mono text-blue-400">Qty: {item.quantity}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleConsume(item.itemId)}
                      className="px-4 py-2 bg-white text-black text-xs font-bold rounded-lg hover:scale-105 active:scale-95 transition-all"
                    >
                      USE
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </section>
    </div>
  );
};
