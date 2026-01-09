import React from 'react';
import ScheduleTimeline from './ScheduleTimeline';

interface TournamentRegistrationInfoProps {
  registrationStartDate: string;
  setRegistrationStartDate: (date: string) => void;
  registrationEndDate: string;
  setRegistrationEndDate: (date: string) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
}

const TournamentRegistrationInfo: React.FC<TournamentRegistrationInfoProps> = ({
  registrationStartDate,
  setRegistrationStartDate,
  registrationEndDate,
  setRegistrationEndDate,
  startDate,
  setStartDate,
  endDate,
  setEndDate
}) => {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Scheduling</h2>
        <p className="text-gray-400">Set your tournament schedule and registration dates</p>
      </div>

      <div className="p-6 bg-gradient-to-br from-blue-500/5 via-emerald-500/5 to-amber-500/5 border border-blue-500/20 rounded-2xl">
        <ScheduleTimeline
          registrationStartDate={registrationStartDate}
          setRegistrationStartDate={setRegistrationStartDate}
          registrationEndDate={registrationEndDate}
          setRegistrationEndDate={setRegistrationEndDate}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
        />
      </div>
    </div>
  );
};

export default TournamentRegistrationInfo;
