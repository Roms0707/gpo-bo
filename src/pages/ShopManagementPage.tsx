import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Search, ShoppingBag, DollarSign, Package } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { useGamificationStore } from '../store/gamificationStore';
import type { Database } from '../types/supabase';

type ShopItem = Database['public']['Tables']['currency_shop_items']['Row'];
type ShopItemInsert = Database['public']['Tables']['currency_shop_items']['Insert'];

const ITEM_TYPES = [
  { value: 'consumable', label: 'Consommable' },
  { value: 'permanent', label: 'Permanent' },
  { value: 'limited', label: 'Édition Limitée' },
];

export default function ShopManagementPage() {
  const { shopItems, isLoading, fetchShopItems, createShopItem, updateShopItem, deleteShopItem } = useGamificationStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ShopItem | null>(null);
  const [formData, setFormData] = useState<ShopItemInsert>({
    name: '',
    description: '',
    price: 100,
    item_type: 'permanent',
    image_url: '',
    is_available: true,
    stock_quantity: null,
  });

  useEffect(() => {
    fetchShopItems();
  }, []);

  const filteredItems = shopItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'all' || item.item_type === filterType;
    return matchesSearch && matchesType;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await updateShopItem(editingItem.id, formData);
      } else {
        await createShopItem(formData);
      }
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving item:', error);
    }
  };

  const handleEdit = (item: ShopItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price,
      item_type: item.item_type,
      image_url: item.image_url,
      is_available: item.is_available,
      stock_quantity: item.stock_quantity,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet item ?')) {
      try {
        await deleteShopItem(id);
      } catch (error) {
        console.error('Error deleting item:', error);
      }
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      description: '',
      price: 100,
      item_type: 'permanent',
      image_url: '',
      is_available: true,
      stock_quantity: null,
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-pink-400" />
            Boutique Virtuelle
          </h1>
          <p className="mt-2 text-slate-400">
            Gérez les items et l'économie virtuelle
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nouvel Item
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-pink-500/10 to-rose-600/10 border-pink-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total Items</p>
              <p className="text-3xl font-bold text-white mt-1">{shopItems.length}</p>
            </div>
            <Package className="w-8 h-8 text-pink-400" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Disponibles</p>
              <p className="text-3xl font-bold text-white mt-1">
                {shopItems.filter((i) => i.is_available).length}
              </p>
            </div>
            <ShoppingBag className="w-8 h-8 text-green-400" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border-yellow-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Prix Moyen</p>
              <p className="text-3xl font-bold text-white mt-1">
                {shopItems.length > 0
                  ? Math.round(shopItems.reduce((sum, i) => sum + i.price, 0) / shopItems.length)
                  : 0}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-yellow-400" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Stock Limité</p>
              <p className="text-3xl font-bold text-white mt-1">
                {shopItems.filter((i) => i.stock_quantity !== null).length}
              </p>
            </div>
            <span className="text-2xl">📦</span>
          </div>
        </Card>
      </div>

      <Card>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Rechercher un item..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">Tous les types</option>
              {ITEM_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Aucun item trouvé</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-slate-700/50 border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      item.is_available
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {item.is_available ? 'Disponible' : 'Indisponible'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-1.5 hover:bg-slate-600 rounded text-slate-400 hover:text-primary-400 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 hover:bg-slate-600 rounded text-slate-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-white mb-2">{item.name}</h3>
                  <p className="text-slate-400 text-sm mb-3 line-clamp-2">
                    {item.description || 'Aucune description'}
                  </p>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-600">
                    <span className="text-yellow-400 font-bold flex items-center gap-1">
                      💰 {item.price} coins
                    </span>
                    {item.stock_quantity !== null && (
                      <span className="text-xs text-slate-500">
                        Stock: {item.stock_quantity}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingItem ? 'Modifier l\'item' : 'Nouvel item'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Nom de l'item *
            </label>
            <Input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Boost XP 24h"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description de l'item..."
              rows={3}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Prix (coins) *
              </label>
              <Input
                type="number"
                required
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Type d'item *
              </label>
              <select
                required
                value={formData.item_type}
                onChange={(e) => setFormData({ ...formData, item_type: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {ITEM_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Stock (laisser vide pour illimité)
            </label>
            <Input
              type="number"
              min="0"
              value={formData.stock_quantity || ''}
              onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="Illimité"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_available}
                onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                className="w-4 h-4 text-primary-600 bg-slate-700 border-slate-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-slate-300">Disponible à l'achat</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {editingItem ? 'Mettre à jour' : 'Créer l\'item'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
