import React, { useState, useEffect, useCallback } from 'react';
import {
  Video,
  Trash2,
  Plus,
  Search,
  Loader2,
  Power,
  FolderOpen,
  ChevronRight,
  ChevronLeft,
  Home,
  RefreshCw,
  Check,
} from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import type { CoachingTopicContentLink } from '../../types/coaching';
import type { GalaxyRubric, RubricPageResult, BreadcrumbItem } from '../../types/galaxyRubricMapping';
import {
  fetchContentLinksForConfig,
  createContentLink,
  deleteContentLink,
  toggleContentLinkActive,
} from '../../services/coachingTopicContentService';
import { fetchCampaignRubrics, clearRubricCache, RubricFetchParams } from '../../services/galaxyApiService';
import toast from 'react-hot-toast';

interface TopicContentLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
  configId: string;
  configValue: string;
  gameId: string;
  campaignId: string;
  countryCode?: string | null;
  languageCode?: string | null;
  onLinksChanged: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  tips: 'Tips',
  masterclass: 'Masterclass',
  grind_zone: 'Grind Zone',
  article: 'Article',
};

const TopicContentLinksModal: React.FC<TopicContentLinksModalProps> = ({
  isOpen,
  onClose,
  configId,
  configValue,
  gameId,
  campaignId,
  countryCode,
  languageCode,
  onLinksChanged,
}) => {
  const [links, setLinks] = useState<CoachingTopicContentLink[]>([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);
  const [showBrowser, setShowBrowser] = useState(false);

  const [rubrics, setRubrics] = useState<GalaxyRubric[]>([]);
  const [isLoadingRubrics, setIsLoadingRubrics] = useState(false);
  const [rubricError, setRubricError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([]);
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);

  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [addingRubricIds, setAddingRubricIds] = useState<Set<string>>(new Set());

  const debounceRef = React.useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (isOpen && configId) {
      loadLinks();
    }
  }, [isOpen, configId]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  const loadLinks = async () => {
    setIsLoadingLinks(true);
    const { data, error } = await fetchContentLinksForConfig(configId);
    if (error) {
      toast.error('Failed to load content links');
    }
    setLinks(data);
    setIsLoadingLinks(false);
  };

  const loadRubrics = useCallback(async () => {
    if (!campaignId) return;
    setIsLoadingRubrics(true);
    setRubricError(null);

    try {
      const params: RubricFetchParams = {
        campaignId,
        countryCode,
        languageCode,
        page: currentPage,
      };

      if (debouncedSearch) {
        params.search = debouncedSearch;
      } else if (currentParentId) {
        params.parentRubricId = currentParentId;
      }

      const { data, error } = await fetchCampaignRubrics(params);
      if (error) throw error;

      setRubrics(data?.rubrics || []);
      setHasMore(data?.hasMore || false);
    } catch (err) {
      setRubricError(err instanceof Error ? err.message : 'Failed to load rubrics');
    } finally {
      setIsLoadingRubrics(false);
    }
  }, [campaignId, countryCode, languageCode, currentPage, debouncedSearch, currentParentId]);

  useEffect(() => {
    if (showBrowser) {
      loadRubrics();
    }
  }, [showBrowser, loadRubrics]);

  const isRubricLinked = (rubricId: string): boolean => {
    return links.some((l) => String(l.rubric_id) === String(rubricId));
  };

  const handleAddRubric = async (rubric: GalaxyRubric) => {
    const rubricIdStr = String(rubric.id);
    if (isRubricLinked(rubricIdStr)) {
      toast.error('This rubric is already linked');
      return;
    }

    setAddingRubricIds((prev) => new Set(prev).add(rubricIdStr));

    const { data, error } = await createContentLink({
      coaching_config_id: configId,
      game_id: gameId,
      rubric_id: rubricIdStr,
      rubric_name: rubric.name,
      content_category: 'tips',
    });

    if (error) {
      toast.error('Failed to link content');
    } else if (data) {
      setLinks((prev) => [...prev, data]);
      onLinksChanged();
      toast.success('Content linked');
    }

    setAddingRubricIds((prev) => {
      const next = new Set(prev);
      next.delete(rubricIdStr);
      return next;
    });
  };

  const handleDeleteLink = async (linkId: string) => {
    setDeletingIds((prev) => new Set(prev).add(linkId));

    const { error } = await deleteContentLink(linkId);
    if (error) {
      toast.error('Failed to remove link');
    } else {
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
      onLinksChanged();
      toast.success('Content unlinked');
    }

    setDeletingIds((prev) => {
      const next = new Set(prev);
      next.delete(linkId);
      return next;
    });
  };

  const handleToggleActive = async (linkId: string, isActive: boolean) => {
    setTogglingIds((prev) => new Set(prev).add(linkId));

    const { error } = await toggleContentLinkActive(linkId, isActive);
    if (error) {
      toast.error('Failed to toggle');
    } else {
      setLinks((prev) =>
        prev.map((l) => (l.id === linkId ? { ...l, is_active: isActive } : l))
      );
      onLinksChanged();
    }

    setTogglingIds((prev) => {
      const next = new Set(prev);
      next.delete(linkId);
      return next;
    });
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Content Links — ${configValue}`}
      size="xl"
      footer={
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-300">
              Linked Content ({links.length})
            </h3>
            <Button
              size="sm"
              onClick={() => setShowBrowser(!showBrowser)}
              leftIcon={showBrowser ? <ChevronLeft size={14} /> : <Plus size={14} />}
              variant={showBrowser ? 'ghost' : 'primary'}
            >
              {showBrowser ? 'Hide Browser' : 'Add Content'}
            </Button>
          </div>

          {isLoadingLinks ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 text-primary-500 animate-spin" />
            </div>
          ) : links.length === 0 ? (
            <div className="text-center py-6 bg-dark-300 rounded-lg border border-dark-100">
              <Video className="h-8 w-8 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No content linked yet</p>
              <p className="text-xs text-gray-600 mt-1">
                Add Galaxy rubrics to recommend videos for this topic
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
              {links.map((link) => (
                <div
                  key={link.id}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all ${
                    link.is_active
                      ? 'border-dark-100 bg-dark-300'
                      : 'border-dark-100 bg-dark-300 opacity-50'
                  }`}
                >
                  <Video className="h-4 w-4 text-primary-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">
                      {link.rubric_name || link.rubric_id}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-600 font-mono truncate">
                        {link.rubric_id}
                      </span>
                      <Badge variant="default">
                        {CATEGORY_LABELS[link.content_category] || link.content_category}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleToggleActive(link.id, !link.is_active)}
                      disabled={togglingIds.has(link.id)}
                      className={`p-1.5 rounded-md transition-colors ${
                        link.is_active
                          ? 'text-success-400 hover:bg-success-500/10'
                          : 'text-gray-500 hover:bg-gray-500/10'
                      }`}
                      title={link.is_active ? 'Disable' : 'Enable'}
                    >
                      <Power className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteLink(link.id)}
                      disabled={deletingIds.has(link.id)}
                      className="p-1.5 rounded-md text-gray-500 hover:text-error-400 hover:bg-error-500/10 transition-colors"
                      title="Remove link"
                    >
                      {deletingIds.has(link.id) ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showBrowser && (
          <div className="border-t border-dark-100 pt-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">
              Browse Galaxy Rubrics
            </h3>

            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search rubrics..."
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
                isLoading={isLoadingRubrics}
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

            {rubricError ? (
              <div className="bg-error-500/10 border border-error-500 rounded-lg p-3 text-error-500 text-sm">
                {rubricError}
              </div>
            ) : isLoadingRubrics ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 text-primary-500 animate-spin" />
              </div>
            ) : rubrics.length === 0 ? (
              <div className="text-center py-8">
                <FolderOpen className="h-10 w-10 text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  {isSearchMode ? 'No rubrics match your search' : 'No rubrics available'}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
                  {rubrics.map((rubric) => {
                    const rubricIdStr = String(rubric.id);
                    const linked = isRubricLinked(rubricIdStr);
                    const isAdding = addingRubricIds.has(rubricIdStr);

                    return (
                      <div
                        key={rubric.id}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all ${
                          linked
                            ? 'border-primary-500/60 bg-primary-500/10'
                            : 'border-dark-200 bg-dark-400 hover:border-dark-100 hover:bg-dark-300'
                        }`}
                      >
                        <button
                          onClick={() => !linked && handleAddRubric(rubric)}
                          disabled={linked || isAdding}
                          className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            linked
                              ? 'bg-primary-500 border-primary-500 cursor-default'
                              : 'bg-transparent border-gray-500 hover:border-gray-400 cursor-pointer'
                          } ${isAdding ? 'opacity-50 cursor-wait' : ''}`}
                        >
                          {isAdding ? (
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : linked ? (
                            <Check size={12} className="text-white" />
                          ) : null}
                        </button>

                        <button
                          onClick={() => !linked && handleAddRubric(rubric)}
                          disabled={linked || isAdding}
                          className="flex-1 min-w-0 text-left"
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
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-3 mt-2 border-t border-dark-200">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1 || isLoadingRubrics}
                    leftIcon={<ChevronLeft size={14} />}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-gray-500">
                    Page {currentPage}
                    {hasMore && '+'}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setCurrentPage((p) => p + 1)}
                    disabled={!hasMore || isLoadingRubrics}
                    rightIcon={<ChevronRight size={14} />}
                  >
                    Next
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default TopicContentLinksModal;
