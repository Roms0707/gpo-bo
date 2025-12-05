import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock, RefreshCw, Search, XCircle } from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import {
  fetchGalaxyApiLogs,
  getGalaxyApiStats,
  GalaxyApiLogEntry,
  GalaxyApiStats,
} from '../../services/galaxyApiLoggingService';

interface GalaxyApiLogsViewerProps {
  campaignId?: string;
  projectConfigId?: string;
}

const GalaxyApiLogsViewer: React.FC<GalaxyApiLogsViewerProps> = ({
  campaignId,
  projectConfigId,
}) => {
  const [logs, setLogs] = useState<GalaxyApiLogEntry[]>([]);
  const [stats, setStats] = useState<GalaxyApiStats | null>(null);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [selectedLog, setSelectedLog] = useState<GalaxyApiLogEntry | null>(null);
  const [filterSuccess, setFilterSuccess] = useState<boolean | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadLogs();
    loadStats();
  }, [campaignId, projectConfigId, filterSuccess]);

  const loadLogs = async () => {
    try {
      setIsLoadingLogs(true);
      const { data, error } = await fetchGalaxyApiLogs({
        campaignId,
        projectConfigId,
        success: filterSuccess,
        limit: 100,
      });

      if (error) throw error;

      setLogs(data || []);
    } catch (error) {
      console.error('Error loading Galaxy API logs:', error);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const loadStats = async () => {
    try {
      setIsLoadingStats(true);
      const { data, error } = await getGalaxyApiStats(campaignId);

      if (error) throw error;

      setStats(data);
    } catch (error) {
      console.error('Error loading Galaxy API stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleRefresh = () => {
    loadLogs();
    loadStats();
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      log.endpoint.toLowerCase().includes(search) ||
      log.error_message?.toLowerCase().includes(search) ||
      log.campaign_id?.toLowerCase().includes(search)
    );
  });

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {isLoadingStats ? (
          <div className="col-span-4 flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          </div>
        ) : stats ? (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Calls</p>
                    <p className="text-2xl font-bold text-white">{stats.total_calls}</p>
                  </div>
                  <Clock className="h-8 w-8 text-primary-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Success Rate</p>
                    <p className="text-2xl font-bold text-success-500">
                      {(100 - (stats.error_rate || 0)).toFixed(1)}%
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-success-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Avg Duration</p>
                    <p className="text-2xl font-bold text-white">
                      {formatDuration(stats.avg_duration_ms)}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-warning-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Failed Calls</p>
                    <p className="text-2xl font-bold text-error-500">{stats.failed_calls}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-error-500" />
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>API Call Logs</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRefresh}
                leftIcon={<RefreshCw size={16} />}
              >
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search logs..."
                  leftIcon={<Search size={16} />}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={filterSuccess === undefined ? 'primary' : 'secondary'}
                  onClick={() => setFilterSuccess(undefined)}
                >
                  All
                </Button>
                <Button
                  size="sm"
                  variant={filterSuccess === true ? 'primary' : 'secondary'}
                  onClick={() => setFilterSuccess(true)}
                >
                  Success
                </Button>
                <Button
                  size="sm"
                  variant={filterSuccess === false ? 'primary' : 'secondary'}
                  onClick={() => setFilterSuccess(false)}
                >
                  Errors
                </Button>
              </div>
            </div>

            {isLoadingLogs ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>No logs found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="p-4 bg-dark-300 rounded-lg hover:bg-dark-200 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {log.success ? (
                            <CheckCircle className="h-5 w-5 text-success-500 flex-shrink-0" />
                          ) : (
                            <XCircle className="h-5 w-5 text-error-500 flex-shrink-0" />
                          )}
                          <span className="font-medium text-white">{log.endpoint}</span>
                          <span className="text-sm text-gray-400">{log.method}</span>
                          {log.response_status && (
                            <span
                              className={`text-sm px-2 py-0.5 rounded ${
                                log.response_status >= 200 && log.response_status < 300
                                  ? 'bg-success-500/20 text-success-500'
                                  : 'bg-error-500/20 text-error-500'
                              }`}
                            >
                              {log.response_status}
                            </span>
                          )}
                        </div>
                        {log.error_message && (
                          <p className="text-sm text-error-500 mb-1">{log.error_message}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          {log.campaign_id && <span>Campaign: {log.campaign_id}</span>}
                          <span>Duration: {formatDuration(log.duration_ms)}</span>
                          <span>{formatDate(log.metadata?.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-400 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-dark-400 border-b border-dark-200 p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Log Details</h3>
              <Button size="sm" variant="ghost" onClick={() => setSelectedLog(null)}>
                <XCircle size={20} />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">Request</h4>
                <div className="bg-dark-300 rounded p-3">
                  <p className="text-white">
                    <span className="text-gray-400">Endpoint:</span> {selectedLog.endpoint}
                  </p>
                  <p className="text-white">
                    <span className="text-gray-400">Method:</span> {selectedLog.method}
                  </p>
                  <p className="text-white">
                    <span className="text-gray-400">Campaign ID:</span> {selectedLog.campaign_id}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">Request Parameters</h4>
                <pre className="bg-dark-300 rounded p-3 text-sm text-white overflow-x-auto">
                  {JSON.stringify(selectedLog.request_params, null, 2)}
                </pre>
              </div>

              {selectedLog.response_body && (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Response Body</h4>
                  <pre className="bg-dark-300 rounded p-3 text-sm text-white overflow-x-auto max-h-96">
                    {typeof selectedLog.response_body === 'string'
                      ? selectedLog.response_body
                      : JSON.stringify(selectedLog.response_body, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.error_message && (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Error Message</h4>
                  <div className="bg-error-500/10 border border-error-500 rounded p-3">
                    <p className="text-error-500">{selectedLog.error_message}</p>
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">Performance</h4>
                <div className="bg-dark-300 rounded p-3">
                  <p className="text-white">
                    <span className="text-gray-400">Duration:</span>{' '}
                    {formatDuration(selectedLog.duration_ms)}
                  </p>
                  <p className="text-white">
                    <span className="text-gray-400">Status Code:</span>{' '}
                    {selectedLog.response_status || 'N/A'}
                  </p>
                  <p className="text-white">
                    <span className="text-gray-400">Success:</span>{' '}
                    {selectedLog.success ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalaxyApiLogsViewer;
