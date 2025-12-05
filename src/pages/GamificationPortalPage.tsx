import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy, Target, Award, Star, TrendingUp,
  Users, Zap, ShoppingBag, BarChart3, Gift
} from 'lucide-react';
import Card from '../components/ui/Card';
import { supabase } from '../lib/supabase';

export default function GamificationPortalPage() {
  const [stats, setStats] = useState({
    totalQuests: 0,
    activeQuests: 0,
    totalAchievements: 0,
    activeSeasons: 0,
    totalXPDistributed: 0,
    activeUsers: 0,
    shopItems: 0,
    completedQuests: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const [
        { count: totalQuests },
        { count: activeQuests },
        { count: totalAchievements },
        { count: activeSeasons },
        { count: shopItems },
        { count: completedQuests },
      ] = await Promise.all([
        supabase.from('quests').select('*', { count: 'exact', head: true }),
        supabase.from('quests').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('achievements').select('*', { count: 'exact', head: true }),
        supabase.from('battle_pass_seasons').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('currency_shop_items').select('*', { count: 'exact', head: true }),
        supabase.from('user_quests').select('*', { count: 'exact', head: true }).eq('is_completed', true),
      ]);

      setStats({
        totalQuests: totalQuests || 0,
        activeQuests: activeQuests || 0,
        totalAchievements: totalAchievements || 0,
        activeSeasons: activeSeasons || 0,
        totalXPDistributed: 0,
        activeUsers: 0,
        shopItems: shopItems || 0,
        completedQuests: completedQuests || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const portalCards = [
    {
      title: 'Quêtes',
      description: 'Gérer les missions et objectifs',
      icon: Target,
      color: 'bg-gradient-to-br from-blue-500 to-blue-600',
      link: '/gamification/quests',
      stats: `${stats.activeQuests} actives / ${stats.totalQuests} total`,
    },
    {
      title: 'Achievements',
      description: 'Badges et accomplissements',
      icon: Award,
      color: 'bg-gradient-to-br from-yellow-500 to-amber-600',
      link: '/gamification/achievements',
      stats: `${stats.totalAchievements} disponibles`,
    },
    {
      title: 'Battle Pass',
      description: 'Saisons et paliers de récompenses',
      icon: Trophy,
      color: 'bg-gradient-to-br from-purple-500 to-purple-600',
      link: '/gamification/battle-pass',
      stats: `${stats.activeSeasons} saisons actives`,
    },
    {
      title: 'Niveaux & XP',
      description: 'Système de progression',
      icon: TrendingUp,
      color: 'bg-gradient-to-br from-green-500 to-emerald-600',
      link: '/gamification/xp-levels',
      stats: 'Configuration de la courbe XP',
    },
    {
      title: 'Boutique Virtuelle',
      description: 'Items et économie',
      icon: ShoppingBag,
      color: 'bg-gradient-to-br from-pink-500 to-rose-600',
      link: '/gamification/shop',
      stats: `${stats.shopItems} items disponibles`,
    },
    {
      title: 'Progressions',
      description: 'Suivi des utilisateurs',
      icon: Users,
      color: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
      link: '/gamification/user-progress',
      stats: `${stats.completedQuests} quêtes complétées`,
    },
    {
      title: 'Événements XP',
      description: 'Multiplicateurs et bonus',
      icon: Zap,
      color: 'bg-gradient-to-br from-orange-500 to-orange-600',
      link: '/gamification/xp-events',
      stats: 'Gérer les bonus temporaires',
    },
    {
      title: 'Analytics',
      description: 'Statistiques détaillées',
      icon: BarChart3,
      color: 'bg-gradient-to-br from-cyan-500 to-cyan-600',
      link: '/gamification/analytics',
      stats: 'Rapports et métriques',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
              <Gift className="w-8 h-8 text-white" />
            </div>
            Portail Gamification
          </h1>
          <p className="mt-2 text-slate-400">
            Centre de gestion de l'engagement et des récompenses utilisateurs
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Quêtes Actives</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.activeQuests}</p>
            </div>
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Target className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-amber-600/10 border-yellow-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Achievements</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.totalAchievements}</p>
            </div>
            <div className="p-3 bg-yellow-500/20 rounded-lg">
              <Award className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Quêtes Complétées</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.completedQuests}</p>
            </div>
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Trophy className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-600/10 border-green-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Items Boutique</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.shopItems}</p>
            </div>
            <div className="p-3 bg-green-500/20 rounded-lg">
              <ShoppingBag className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </Card>
      </div>

      <div>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-400" />
          Modules de Gamification
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {portalCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.title}
                to={card.link}
                className="group"
              >
                <Card className="h-full transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary-500/20 border-slate-700 hover:border-primary-500/50">
                  <div className="flex flex-col h-full">
                    <div className={`${card.color} p-4 rounded-lg mb-4 transition-transform duration-300 group-hover:scale-110`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-primary-400 transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-sm text-slate-400 mb-3">
                      {card.description}
                    </p>
                    <div className="mt-auto pt-3 border-t border-slate-700">
                      <p className="text-xs text-slate-500 group-hover:text-primary-400 transition-colors">
                        {card.stats}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary-500/20 rounded-lg">
            <Zap className="w-6 h-6 text-primary-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">
              Bienvenue dans le Portail Gamification
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Ce portail vous permet de gérer tous les aspects de la gamification de votre plateforme.
              Créez des quêtes engageantes, configurez des achievements, gérez les saisons de Battle Pass,
              et suivez la progression de vos utilisateurs en temps réel. Chaque module est conçu pour
              maximiser l'engagement et la rétention des joueurs.
            </p>
            <div className="mt-4 flex gap-3">
              <Link
                to="/gamification/quests"
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Créer une quête
              </Link>
              <Link
                to="/gamification/battle-pass"
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Configurer Battle Pass
              </Link>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
