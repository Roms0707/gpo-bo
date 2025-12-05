import React, { useState } from 'react';
import { Search, Users, TrendingUp, Award, Trophy } from 'lucide-react';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';

export default function UserProgressPage() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-indigo-400" />
            Suivi des Utilisateurs
          </h1>
          <p className="mt-2 text-slate-400">
            Consultez et gérez la progression des joueurs
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/10 border-indigo-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Utilisateurs Actifs</p>
              <p className="text-3xl font-bold text-white mt-1">0</p>
            </div>
            <Users className="w-8 h-8 text-indigo-400" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Niveau Moyen</p>
              <p className="text-3xl font-bold text-white mt-1">0</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-400" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border-yellow-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Achievements Totaux</p>
              <p className="text-3xl font-bold text-white mt-1">0</p>
            </div>
            <Award className="w-8 h-8 text-yellow-400" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Battle Pass Actifs</p>
              <p className="text-3xl font-bold text-white mt-1">0</p>
            </div>
            <Trophy className="w-8 h-8 text-purple-400" />
          </div>
        </Card>
      </div>

      <Card>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Rechercher un utilisateur par nom, email ou ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="text-center py-12">
            <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">Recherchez un utilisateur pour voir sa progression</p>
            <p className="text-slate-500 text-sm mt-2">
              Fonctionnalité disponible prochainement
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
