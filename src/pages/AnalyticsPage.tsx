import React from 'react';
import { BarChart3, TrendingUp, Users, Award, Trophy, ShoppingBag, Target, Zap } from 'lucide-react';
import Card from '../components/ui/Card';

export default function AnalyticsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-cyan-400" />
            Analytics Gamification
          </h1>
          <p className="mt-2 text-slate-400">
            Statistiques détaillées et métriques d'engagement
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Utilisateurs Actifs</p>
              <p className="text-3xl font-bold text-white mt-1">0</p>
              <p className="text-xs text-green-400 mt-1">+0% ce mois</p>
            </div>
            <Users className="w-8 h-8 text-blue-400" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Battle Pass Actifs</p>
              <p className="text-3xl font-bold text-white mt-1">0</p>
              <p className="text-xs text-green-400 mt-1">0% conversion</p>
            </div>
            <Trophy className="w-8 h-8 text-purple-400" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border-yellow-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Quêtes Complétées</p>
              <p className="text-3xl font-bold text-white mt-1">0</p>
              <p className="text-xs text-green-400 mt-1">0% taux</p>
            </div>
            <Target className="w-8 h-8 text-yellow-400" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Achievements Débloqués</p>
              <p className="text-3xl font-bold text-white mt-1">0</p>
              <p className="text-xs text-green-400 mt-1">0% unlock rate</p>
            </div>
            <Award className="w-8 h-8 text-green-400" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Progression XP
          </h3>
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-600 rounded-lg">
            <p className="text-slate-500">Graphique de progression XP</p>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            Distribution des Niveaux
          </h3>
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-600 rounded-lg">
            <p className="text-slate-500">Graphique de distribution</p>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-pink-400" />
            Revenus Boutique
          </h3>
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-600 rounded-lg">
            <p className="text-slate-500">Graphique des revenus</p>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-purple-400" />
            Tiers Battle Pass
          </h3>
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-600 rounded-lg">
            <p className="text-slate-500">Distribution des paliers</p>
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-orange-400" />
          Métriques d'Engagement
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-700/50 rounded-lg">
            <p className="text-sm text-slate-400 mb-1">Connexions Quotidiennes</p>
            <p className="text-2xl font-bold text-white">0</p>
          </div>
          <div className="p-4 bg-slate-700/50 rounded-lg">
            <p className="text-sm text-slate-400 mb-1">Temps Moyen Joué</p>
            <p className="text-2xl font-bold text-white">0h</p>
          </div>
          <div className="p-4 bg-slate-700/50 rounded-lg">
            <p className="text-sm text-slate-400 mb-1">Taux de Rétention</p>
            <p className="text-2xl font-bold text-white">0%</p>
          </div>
          <div className="p-4 bg-slate-700/50 rounded-lg">
            <p className="text-sm text-slate-400 mb-1">Items Achetés</p>
            <p className="text-2xl font-bold text-white">0</p>
          </div>
        </div>
      </Card>

      <Card className="bg-gradient-to-br from-slate-700/50 to-slate-800/50">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-cyan-500/20 rounded-lg">
            <BarChart3 className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Analytics en Développement
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Les graphiques et statistiques détaillées seront disponibles prochainement. Cette page affichera
              des données en temps réel sur l'engagement des utilisateurs, la progression du Battle Pass,
              les revenus de la boutique virtuelle, et bien plus encore.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
