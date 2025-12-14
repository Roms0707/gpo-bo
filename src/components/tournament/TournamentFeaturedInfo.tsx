import React from 'react';
import Input from '../ui/Input';
import RadioGroup from '../ui/RadioGroup';
import { Star, Video, Info } from 'lucide-react';

interface TournamentFeaturedInfoProps {
  isFeatured: boolean;
  setIsFeatured: (value: boolean) => void;
  videoUrl: string;
  setVideoUrl: (value: string) => void;
  featuredTitle: string;
  setFeaturedTitle: (value: string) => void;
}

const TournamentFeaturedInfo: React.FC<TournamentFeaturedInfoProps> = ({
  isFeatured,
  setIsFeatured,
  videoUrl,
  setVideoUrl,
  featuredTitle,
  setFeaturedTitle,
}) => {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Featured Tournament</h2>
        <p className="text-gray-400">Configure hero carousel display settings</p>
      </div>

      <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-200">
              Featured tournaments appear in the hero carousel on the homepage.
              When enabled, you must provide a video URL that will be displayed in the carousel.
            </p>
          </div>
        </div>
      </div>

      <RadioGroup
        name="isFeatured"
        label="Feature this tournament in the hero carousel?"
        value={isFeatured ? 'yes' : 'no'}
        onChange={(value) => setIsFeatured(value === 'yes')}
        options={[
          {
            value: 'yes',
            label: 'Yes',
            description: 'Display this tournament in the homepage hero carousel with a video trailer',
          },
          {
            value: 'no',
            label: 'No',
            description: 'This tournament will not appear in the hero carousel',
          },
        ]}
      />

      {isFeatured && (
        <div className="space-y-6 mt-6 p-6 bg-gray-800/50 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-semibold text-white">Featured Settings</h3>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Video URL <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Video className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://example.com/video.mp4 or YouTube/Vimeo URL"
                className="pl-10"
                required
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Enter a direct video URL or embed URL (YouTube, Vimeo, etc.)
            </p>
            {videoUrl && (
              <div className="mt-2 p-2 bg-gray-700/50 rounded text-sm text-gray-300 break-all">
                {videoUrl}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Custom Title (Optional)
            </label>
            <Input
              type="text"
              value={featuredTitle}
              onChange={(e) => setFeaturedTitle(e.target.value)}
              placeholder="Leave empty to use tournament title"
            />
            <p className="mt-1 text-xs text-gray-500">
              Override the displayed title in the hero carousel. If empty, the tournament title will be used.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentFeaturedInfo;
