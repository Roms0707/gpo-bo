import React from 'react';
import { CheckCircle, Clock, TrendingUp, UserCheck, Users, AlertTriangle, Zap } from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import { RegistrationStats } from '../../hooks/useRegistrationStats';

interface RegistrationKPIsProps {
  stats: RegistrationStats | null;
  isLoading: boolean;
}

const RegistrationKPIs: React.FC<RegistrationKPIsProps> = ({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-dark-100 rounded-lg h-40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-8 text-gray-400">
        No registration data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">Registration Analytics</h3>
        <div className="flex items-center space-x-2">
          <div className="h-2 w-2 bg-success-500 rounded-full animate-pulse" />
          <span className="text-xs text-gray-400">Live</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-success-600 to-success-800 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-success-100 text-sm">Conversion Rate</p>
                <h3 className="text-3xl font-bold mt-1">{stats.conversionRate}%</h3>
              </div>
              <div className="p-3 bg-white/10 rounded-lg">
                <CheckCircle className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-white/20 h-2 rounded-full">
                <div
                  className="bg-white h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(stats.conversionRate, 100)}%` }}
                />
              </div>
              <p className="text-xs mt-2 text-success-100">
                {stats.approvedRegistrations} approved of {stats.totalRegistrations} total
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary-600 to-primary-800 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-100 text-sm">Avg Fill Rate</p>
                <h3 className="text-3xl font-bold mt-1">{stats.avgFillRate}%</h3>
              </div>
              <div className="p-3 bg-white/10 rounded-lg">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-white/20 h-2 rounded-full">
                <div
                  className="bg-white h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(stats.avgFillRate, 100)}%` }}
                />
              </div>
              <p className="text-xs mt-2 text-primary-100">
                Tournament capacity utilization
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent-600 to-accent-800 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-accent-100 text-sm">Registration Speed</p>
                <h3 className="text-3xl font-bold mt-1">{stats.avgRegistrationSpeed}h</h3>
              </div>
              <div className="p-3 bg-white/10 rounded-lg">
                <Zap className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="text-accent-100">Avg time to first registration</span>
              <Badge className="bg-white/20 text-white">
                {stats.avgRegistrationSpeed < 24 ? 'Fast' : stats.avgRegistrationSpeed < 72 ? 'Normal' : 'Slow'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-secondary-600 to-secondary-800 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary-100 text-sm">Status Distribution</p>
                <h3 className="text-3xl font-bold mt-1">{stats.totalRegistrations}</h3>
              </div>
              <div className="p-3 bg-white/10 rounded-lg">
                <Users className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-white/20 h-2 rounded-full flex overflow-hidden">
                <div
                  className="bg-success-400 h-2 transition-all duration-500"
                  style={{
                    width: `${(stats.approvedRegistrations / stats.totalRegistrations) * 100}%`,
                  }}
                  title={`Approved: ${stats.approvedRegistrations}`}
                />
                <div
                  className="bg-yellow-400 h-2 transition-all duration-500"
                  style={{
                    width: `${(stats.pendingRegistrations / stats.totalRegistrations) * 100}%`,
                  }}
                  title={`Pending: ${stats.pendingRegistrations}`}
                />
                <div
                  className="bg-gray-400 h-2 transition-all duration-500"
                  style={{
                    width: `${(stats.backupRegistrations / stats.totalRegistrations) * 100}%`,
                  }}
                  title={`Backup: ${stats.backupRegistrations}`}
                />
                <div
                  className="bg-error-400 h-2 transition-all duration-500"
                  style={{
                    width: `${(stats.rejectedRegistrations / stats.totalRegistrations) * 100}%`,
                  }}
                  title={`Rejected: ${stats.rejectedRegistrations}`}
                />
              </div>
              <div className="flex justify-between text-xs mt-2 text-secondary-100">
                <span>Approved: {stats.approvedRegistrations}</span>
                <span>Pending: {stats.pendingRegistrations}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-dark-100 border border-dark-200">
          <CardHeader>
            <CardTitle className="flex items-center text-white text-base">
              <UserCheck className="h-5 w-5 text-success-500 mr-2" />
              Player Retention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="relative w-24 h-24">
                  <svg className="w-24 h-24 transform -rotate-90">
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-dark-200"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 40}`}
                      strokeDashoffset={`${2 * Math.PI * 40 * (1 - stats.retentionRate / 100)}`}
                      className="text-success-500 transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">{stats.retentionRate}%</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-white">{stats.newVsReturning.returning}</p>
                  <p className="text-xs text-gray-400">Returning players</p>
                </div>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-dark-200">
                <div>
                  <p className="text-gray-400">New</p>
                  <p className="font-semibold text-white">{stats.newVsReturning.new}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400">Returning</p>
                  <p className="font-semibold text-white">{stats.newVsReturning.returning}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-dark-100 border border-dark-200">
          <CardHeader>
            <CardTitle className="flex items-center text-white text-base">
              <Clock className="h-5 w-5 text-primary-500 mr-2" />
              Peak Registration Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.peakRegistrationTime ? (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-4xl font-bold text-white mb-2">
                    {stats.peakRegistrationTime.hour}:00
                  </p>
                  <p className="text-sm text-gray-400">Most active hour</p>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-dark-200">
                  <div>
                    <p className="text-xs text-gray-400">Peak Day</p>
                    <p className="font-semibold text-white">{stats.peakRegistrationTime.day}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Registrations</p>
                    <p className="font-semibold text-white">{stats.peakRegistrationTime.count}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-dark-100 border border-dark-200">
          <CardHeader>
            <CardTitle className="flex items-center text-white text-base">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
              Performance Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-dark-200 rounded-lg">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3" />
                  <div>
                    <p className="text-sm font-medium text-white">Underperforming</p>
                    <p className="text-xs text-gray-400">Less than 50% filled</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-white">{stats.underperformingTournaments}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-dark-200 rounded-lg">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-error-500 rounded-full mr-3" />
                  <div>
                    <p className="text-sm font-medium text-white">Abandonment</p>
                    <p className="text-xs text-gray-400">Rejected rate</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-white">{stats.abandonmentRate}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegistrationKPIs;
