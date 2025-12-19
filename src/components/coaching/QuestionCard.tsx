import React, { useState } from 'react';
import { ChevronDown, ChevronUp, MessageSquare, Clock, Tag } from 'lucide-react';
import type { CoachingQuestion } from '../../types/coaching';
import TopicBadge from './TopicBadge';

interface QuestionCardProps {
  question: CoachingQuestion;
  showResponse?: boolean;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ question, showResponse = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-dark-200 border border-dark-100 rounded-lg p-4 hover:border-primary-500/30 transition-colors">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-primary-500/10 rounded-lg shrink-0">
          <MessageSquare className="h-4 w-4 text-primary-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm leading-relaxed">
            {question.question_text}
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            {question.detected_topics?.slice(0, 3).map((topic, index) => (
              <TopicBadge key={index} topic={topic} />
            ))}
            {question.detected_topics && question.detected_topics.length > 3 && (
              <span className="text-xs text-gray-500">
                +{question.detected_topics.length - 3} more
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{formatDate(question.created_at)}</span>
            </div>
            {question.category && (
              <div className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                <span>{question.category}</span>
              </div>
            )}
          </div>

          {showResponse && question.response_text && (
            <div className="mt-3">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    Hide Response
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    Show Response
                  </>
                )}
              </button>
              {isExpanded && (
                <div className="mt-2 p-3 bg-dark-300 rounded-lg text-sm text-gray-300 leading-relaxed">
                  {question.response_text}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestionCard;
