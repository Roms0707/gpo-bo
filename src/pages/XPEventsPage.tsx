import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Zap, Calendar, TrendingUp, CheckCircle, XCircle } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { useGamificationStore } from '../store/gamificationStore';
import type { Database } from '../types/supabase';

type XPEvent = Database['public']['Tables']['xp_events']['Row'];
type XPEventInsert = Database['public']['Tables']['xp_events']['Insert'];

export default function XPEventsPage() {
  const { xpEvents, isLoading, fetchXPEvents, createXPEvent, updateXPEvent, deleteXPEvent } = useGamificationStore();
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<XPEvent | null>(null);
  const [formData, setFormData] = useState<XPEventInsert>({
    event_name: '',
    event_type: 'global_multiplier',
    xp_amount: 0,
    multiplier: 2,
    is_active: true,
  });

  useEffect(() => {
    fetchXPEvents();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEvent) {
        await updateXPEvent(editingEvent.id, formData);
      } else {
        await createXPEvent(formData);
      }
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving event:', error);
    }
  };

  const handleEdit = (event: XPEvent) => {
    setEditingEvent(event);
    setFormData({
      event_name: event.event_name,
      event_type: event.event_type,
      xp_amount: event.xp_amount,
      multiplier: event.multiplier,
      is_active: event.is_active,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) {
      try {
        await deleteXPEvent(id);
      } catch (error) {
        console.error('Error deleting event:', error);
      }
    }
  };

  const resetForm = () => {
    setEditingEvent(null);
    setFormData({
      event_name: '',
      event_type: 'global_multiplier',
      xp_amount: 0,
      multiplier: 2,
      is_active: true,
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
            <Zap className="w-8 h-8 text-orange-400" />
            Événements XP
          </h1>
          <p className="mt-2 text-slate-400">
            Gérez les multiplicateurs et bonus temporaires
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
          Nouvel Événement
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total Événements</p>
              <p className="text-3xl font-bold text-white mt-1">{xpEvents.length}</p>
            </div>
            <Calendar className="w-8 h-8 text-orange-400" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Actifs</p>
              <p className="text-3xl font-bold text-white mt-1">
                {xpEvents.filter((e) => e.is_active).length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Multiplicateur Max</p>
              <p className="text-3xl font-bold text-white mt-1">
                {xpEvents.length > 0 ? Math.max(...xpEvents.map(e => e.multiplier)) : 0}x
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-400" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border-yellow-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Bonus Total XP</p>
              <p className="text-3xl font-bold text-white mt-1">
                {xpEvents.filter(e => e.is_active).reduce((sum, e) => sum + e.xp_amount, 0)}
              </p>
            </div>
            <Zap className="w-8 h-8 text-yellow-400" />
          </div>
        </Card>
      </div>

      <Card>
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Événements XP</h2>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
            </div>
          ) : xpEvents.length === 0 ? (
            <div className="text-center py-12">
              <Zap className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Aucun événement XP créé</p>
            </div>
          ) : (
            <div className="space-y-3">
              {xpEvents.map((event) => (
                <div
                  key={event.id}
                  className="p-4 bg-slate-700/50 border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{event.event_name}</h3>
                        {event.is_active ? (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-400" />
                        )}
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <span className="text-orange-400 flex items-center gap-1">
                          <Zap className="w-4 h-4" />
                          {event.multiplier}x Multiplicateur
                        </span>
                        {event.xp_amount > 0 && (
                          <span className="text-yellow-400">
                            +{event.xp_amount} XP
                          </span>
                        )}
                        <span className="text-slate-500">
                          Type: {event.event_type}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(event)}
                        className="p-2 hover:bg-slate-600 rounded-lg text-slate-400 hover:text-primary-400 transition-colors"
                        title="Modifier"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(event.id)}
                        className="p-2 hover:bg-slate-600 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
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
        title={editingEvent ? 'Modifier l\'événement' : 'Nouvel événement XP'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Nom de l'événement *
            </label>
            <Input
              type="text"
              required
              value={formData.event_name}
              onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
              placeholder="Ex: Weekend Double XP"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Type d'événement *
            </label>
            <Input
              type="text"
              required
              value={formData.event_type}
              onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
              placeholder="Ex: global_multiplier, tournament_bonus"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Multiplicateur XP *
              </label>
              <Input
                type="number"
                required
                min="1"
                step="0.1"
                value={formData.multiplier}
                onChange={(e) => setFormData({ ...formData, multiplier: parseFloat(e.target.value) })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Bonus XP fixe
              </label>
              <Input
                type="number"
                min="0"
                value={formData.xp_amount}
                onChange={(e) => setFormData({ ...formData, xp_amount: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-primary-600 bg-slate-700 border-slate-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-slate-300">Événement actif</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {editingEvent ? 'Mettre à jour' : 'Créer l\'événement'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
