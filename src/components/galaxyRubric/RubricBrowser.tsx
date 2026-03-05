import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  Check,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  AlertCircle,
  CheckSquare,
  Square,
  Eye,
  EyeOff,
  FolderOpen,
  Home,
  Loader2,
} from 'lucide-react';
import Button from '../ui/Button';
import {
  GalaxyRubric,
  GalaxyRubricMapping,
  RubricPageResult,
  BreadcrumbItem,
  RubricScope,
  ContentCategory,
} from '../../types/galaxyRubricMapping';
import { fetchCampaignRubrics, clearRubricCache, RubricFetchParams } from '../../services/galaxyApiService';
import {
  createRubricMapping,
  deleteRubricMapping,
  toggleDisplayOnFrontend,
  bulkUpdateRubricNames,
} from '../../services/galaxyRubricMappingService';
import toast from 'react-hot-toast';

interface RubricBrowserProps {
  projectConfigId: string;
  campaignId: string;
  countryCode?: string | null;
  languageCode?: string | null;
  scope: RubricScope;
  gameId: string | null;
  contentCategory: ContentCategory;
  mappings: GalaxyRubricMapping[];
  onMappingsChange: () => void;
}

const RubricBrowser: React.FC<RubricBrowserProps> = ({
  projectConfigId,
  campaignId,
  countryCode,
  languageCode,
  scope,
  gameId,
  contentCategory,
  mappings,
  onMappingsChange,
}) => {
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pageResult, setPageResult] = useState<RubricPageResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingRubrics, setTogglingRubrics] = useState<Set<string>>(new Set());
  const [togglingVisibility, setTogglingVisibility] = useState<Set<string>>(new Set());
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();
  const listRef = useRef<HTMLDivElement>(null);

  const scopeMappings = mappings.filter((m) => {
    if (scope === 'project') return m.scope === 'project' && m.game_id === null && m.content_category === contentCategory;
    return m.scope === 'game' && m.game_id === gameId && m.content_category === contentCategory;
  });

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchQuery]);

  const loadRubrics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params: RubricFetchParams = {
        campaignId,
        countryCode,
        languageCode,
        projectConfigId,
        page: currentPage,
      };

      if (debouncedSearch) {
        params.search = debouncedSearch;
      } else if (currentParentId) {
        params.parentRubricId = currentParentId;
      }

      const { data, error: fetchError } = await fetchCampaignRubrics(params);
      if (fetchError) throw fetchError;

      setPageResult(data);

      if (data && data.rubrics.length > 0 && scopeMappings.length > 0) {
        syncRubricNames(data.rubrics);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rubrics');
    } finally {
      setIsLoading(false);
    }
  }, [campaignId, countryCode, languageCode, projectConfigId, currentPage, debouncedSearch, currentParentId]);

  useEffect(() => {
    loadRubrics();
  }, [loadRubrics]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [currentPage, currentParentId, debouncedSearch]);

  const syncRubricNames = async (rubrics: GalaxyRubric[]) => {
    const rubricMap = new Map(rubrics.map((r) => [String(r.id), r.name]));
    const updates: { id: string; rubric_name: string }[] = [];

    for (const mapping of scopeMappings) {
      const apiName = rubricMap.get(String(mapping.rubric_id));
      if (apiName && apiName !== mapping.rubric_name) {
        updates.push({ id: mapping.id, rubric_name: apiName });
      }
    }

    if (updates.length > 0) {
      const { updatedCount, error: updateError } = await bulkUpdateRubricNames(updates);
      if (!updateError && updatedCount > 0) {
        onMappingsChange();
      }
    }
  };

  const isRubricMapped = (rubricId: string): boolean => {
    return scopeMappings.some((m) => String(m.rubric_id) === String(rubricId));
  };

  const getMappingForRubric = (rubricId: string): GalaxyRubricMapping | undefined => {
    return scopeMappings.find((m) => String(m.rubric_id) === String(rubricId));
  };

  const handleRubricToggle = async (rubric: GalaxyRubric) => {
    const rubricIdStr = String(rubric.id);
    setTogglingRubrics((prev) => new Set(prev).add(rubricIdStr));

    try {
      const existingMapping = getMappingForRubric(rubricIdStr);

      if (existingMapping) {
        const { error: delError } = await deleteRubricMapping(existingMapping.id);
        if (delError) throw delError;
      } else {
        const { error: createError } = await createRubricMapping({
          project_config_id: projectConfigId,
          game_id: scope === 'game' ? gameId : null,
          rubric_id: rubricIdStr,
          rubric_name: rubric.name,
          scope,
          content_category: contentCategory,
        });
        if (createError) throw createError;
      }

      onMappingsChange();
    } catch (err) {
      console.error('Error toggling rubric:', err);
    } finally {
      setTogglingRubrics((prev) => {
        const next = new Set(prev);
        next.delete(rubricIdStr);
        return next;
      });
    }
  };

  const handleVisibilityToggle = async (e: React.MouseEvent, mapping: GalaxyRubricMapping) => {
    e.stopPropagation();
    setTogglingVisibility((prev) => new Set(prev).add(mapping.id));

    try {
      const { error: toggleError } = await toggleDisplayOnFrontend(mapping.id, !mapping.display_on_frontend);
      if (toggleError) throw toggleError;
      onMappingsChange();
    } catch (err) {
      console.error('Error toggling visibility:', err);
    } finally {
      setTogglingVisibility((prev) => {
        const next = new Set(prev);
        next.delete(mapping.id);
        return next;
      });
    }
  };

  const handleSelectAllPage = async () => {
    if (!pageResult) return;
    const unassigned = pageResult.rubrics.filter((r) => !isRubricMapped(String(r.id)));
    if (unassigned.length === 0) {
      toast.success('All rubrics on this page are already assigned');
      return;
    }

    const allIds = unassigned.map((r) => String(r.id));
    setTogglingRubrics(new Set(allIds));

    try {
      for (const rubric of unassigned) {
        await createRubricMapping({
          project_config_id: projectConfigId,
          game_id: scope === 'game' ? gameId : null,
          rubric_id: String(rubric.id),
          rubric_name: rubric.name,
          scope,
          content_category: contentCategory,
        });
      }
      onMappingsChange();
      toast.success(`Assigned ${unassigned.length} rubric(s)`);
    } catch (err) {
      console.error('Error selecting all rubrics:', err);
      toast.error('Failed to assign some rubrics');
    } finally {
      setTogglingRubrics(new Set());
    }
  };

  const handleClearAllPage = async () => {
    if (!pageResult) return;
    const pageRubricIds = new Set(pageResult.rubrics.map((r) => String(r.id)));
    const pageMappings = scopeMappings.filter((m) => pageRubricIds.has(String(m.rubric_id)));

    if (pageMappings.length === 0) {
      toast.success('No rubrics to clear on this page');
      return;
    }

    const allIds = pageMappings.map((m) => String(m.rubric_id));
    setTogglingRubrics(new Set(allIds));

    try {
      for (const mapping of pageMappings) {
        await deleteRubricMapping(mapping.id);
      }
      onMappingsChange();
      toast.success(`Cleared ${pageMappings.length} rubric(s)`);
    } catch (err) {
      console.error('Error clearing rubrics:', err);
      toast.error('Failed to clear some rubrics');
    } finally {
      setTogglingRubrics(new Set());
    }
  };

  const handleDrillInto = (rubric: GalaxyRubric) => {
    setBreadcrumb((prev) => [...prev, { id: rubric.id, name: rubric.name }]);
    setCurrentParentId(rubric.id);
    setCurrentPage(1);
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      setBreadcrumb([]);
      setCurrentParentId(null);
    } else {
      const item = breadcrumb[index];
      setBreadcrumb(breadcrumb.slice(0, index + 1));
      setCurrentParentId(item.id);
    }
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    clearRubricCache();
    loadRubrics();
  };

  const isSearchMode = debouncedSearch.length > 0;
  const rubrics = pageResult?.rubrics || [];
  const assignedOnPage = rubrics.filter((r) => isRubricMapped(String(r.id))).length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search rubrics by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-dark-400 border border-dark-200 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              &times;
            </button>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleRefresh}
          isLoading={isLoading}
          leftIcon={<RefreshCw size={14} />}
        >
          Refresh
        </Button>
      </div>

      {!isSearchMode && breadcrumb.length > 0 && (
        <div className="flex items-center gap-1 mb-3 text-sm overflow-x-auto pb-1">
          <button
            onClick={() => handleBreadcrumbClick(-1)}
            className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors flex-shrink-0 px-1.5 py-0.5 rounded hover:bg-dark-300"
          >
            <Home size={13} />
            <span>Root</span>
          </button>
          {breadcrumb.map((item, index) => (
            <React.Fragment key={item.id}>
              <ChevronRight size={14} className="text-gray-600 flex-shrink-0" />
              <button
                onClick={() => handleBreadcrumbClick(index)}
                className={`flex-shrink-0 px-1.5 py-0.5 rounded truncate max-w-[160px] transition-colors ${
                  index === breadcrumb.length - 1
                    ? 'text-primary-400 font-medium'
                    : 'text-gray-400 hover:text-white hover:bg-dark-300'
                }`}
              >
                {item.name}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      {isSearchMode && (
        <div className="mb-3 px-2 py-1.5 bg-dark-400 rounded-lg border border-dark-200">
          <p className="text-xs text-gray-400">
            Searching across all rubric levels for "{debouncedSearch}"
          </p>
        </div>
      )}

      {error ? (
        <div className="bg-error-500/10 border border-error-500 rounded-lg p-4 text-error-500">
          <div className="flex items-start gap-2">
            <AlertCircle className="flex-shrink-0 mt-0.5" size={18} />
            <div>
              <p className="font-medium">Failed to load rubrics</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      ) : isLoading ? (
        <div className="flex-1 flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 text-primary-500 animate-spin" />
        </div>
      ) : rubrics.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
          <FolderOpen className="h-12 w-12 text-gray-600 mb-3" />
          <p className="text-gray-400 text-sm">
            {isSearchMode
              ? 'No rubrics match your search'
              : breadcrumb.length > 0
              ? 'This rubric has no children'
              : 'No rubrics available'}
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500">
              {assignedOnPage} of {rubrics.length} assigned on this page
              {scopeMappings.length > 0 && (
                <span className="ml-2 text-gray-600">
                  ({scopeMappings.length} total mapped)
                </span>
              )}
            </p>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSelectAllPage}
                disabled={assignedOnPage === rubrics.length || togglingRubrics.size > 0}
                leftIcon={<CheckSquare size={13} />}
                className="text-xs"
              >
                All
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleClearAllPage}
                disabled={assignedOnPage === 0 || togglingRubrics.size > 0}
                leftIcon={<Square size={13} />}
                className="text-xs"
              >
                Clear
              </Button>
            </div>
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto pr-1 space-y-1 min-h-0">
            {rubrics.map((rubric) => {
              const rubricIdStr = String(rubric.id);
              const isMapped = isRubricMapped(rubricIdStr);
              const isToggling = togglingRubrics.has(rubricIdStr);
              const mapping = getMappingForRubric(rubricIdStr);
              const isVisibilityToggling = mapping ? togglingVisibility.has(mapping.id) : false;

              return (
                <div
                  key={rubric.id}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all ${
                    isMapped
                      ? 'border-primary-500/60 bg-primary-500/10'
                      : 'border-dark-200 bg-dark-400 hover:border-dark-100 hover:bg-dark-300'
                  }`}
                >
                  <button
                    onClick={() => handleRubricToggle(rubric)}
                    disabled={isToggling}
                    className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      isMapped
                        ? 'bg-primary-500 border-primary-500'
                        : 'bg-transparent border-gray-500 hover:border-gray-400'
                    } ${isToggling ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                  >
                    {isToggling ? (
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : isMapped ? (
                      <Check size={12} className="text-white" />
                    ) : null}
                  </button>

                  <button
                    onClick={() => handleRubricToggle(rubric)}
                    disabled={isToggling}
                    className="flex-1 min-w-0 text-left cursor-pointer"
                  >
                    <p className="text-sm font-medium text-white truncate">{rubric.name}</p>
                    <p className="text-xs text-gray-500 font-mono truncate">{rubric.id}</p>
                  </button>

                  {rubric.has_children && !isSearchMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDrillInto(rubric);
                      }}
                      className="flex-shrink-0 p-1.5 rounded text-gray-400 hover:text-white hover:bg-dark-200 transition-colors"
                      title="Browse children"
                    >
                      <FolderOpen size={15} />
                    </button>
                  )}

                  {isMapped && mapping && (
                    <button
                      onClick={(e) => handleVisibilityToggle(e, mapping)}
                      disabled={isVisibilityToggling}
                      className={`flex-shrink-0 p-1.5 rounded transition-colors ${
                        mapping.display_on_frontend
                          ? 'text-emerald-400 hover:bg-emerald-500/20'
                          : 'text-gray-500 hover:bg-dark-200'
                      } ${isVisibilityToggling ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                      title={mapping.display_on_frontend ? 'Visible on frontend' : 'Hidden from frontend'}
                    >
                      {mapping.display_on_frontend ? <Eye size={15} /> : <EyeOff size={15} />}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-3 mt-2 border-t border-dark-200">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || isLoading}
              leftIcon={<ChevronLeft size={14} />}
            >
              Previous
            </Button>
            <span className="text-xs text-gray-500">
              Page {currentPage}
              {pageResult?.hasMore && '+'}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={!pageResult?.hasMore || isLoading}
              rightIcon={<ChevronRight size={14} />}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default RubricBrowser;
