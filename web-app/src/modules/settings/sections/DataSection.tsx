import React, { useState, useRef, useEffect } from 'react';
import { Download, Upload, Cloud, CloudOff, RefreshCw, Save, Database, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../SettingsContext';
import { BackupService, BackupData } from '../../../services/backupService';
import toast from 'react-hot-toast';
import { cn } from '../../../utils/cn';

export const DataSection = () => {
    const { t } = useTranslation();
    const { user } = useSettings();
    const [isLoading, setIsLoading] = useState(false);
    const [lastCloudBackup, setLastCloudBackup] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auto Backup state
    const [autoBackup, setAutoBackup] = useState(false);

    useEffect(() => {
        const fetchBackupInfo = async () => {
            if (!user?.id) return;
            try {
                const { supabase } = await import('../../../services/supabase');
                const { data, error } = await supabase
                    .from('user_collections')
                    .select('data')
                    .eq('id', `backup_${user.id}`)
                    .eq('user_id', user.id)
                    .eq('collection_name', 'backups')
                    .limit(1);
                
                if (!error && data && data.length > 0 && data[0]?.data?.timestamp) {
                    setLastCloudBackup(new Date(data[0].data.timestamp).toLocaleString());
                }

                // Also fetch auto-backup preference
                const { persistenceService } = await import('../../../services/persistenceService');
                const settingsData = await persistenceService.settings.get(user.id);
                if (settingsData?.autoBackupEnabled !== undefined) {
                    setAutoBackup(settingsData.autoBackupEnabled);
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchBackupInfo();
    }, [user?.id]);

    const handleToggleAutoBackup = async () => {
        if (!user?.id) return;
        const newValue = !autoBackup;
        setAutoBackup(newValue);
        try {
            const { persistenceService } = await import('../../../services/persistenceService');
            const currentSettings = await persistenceService.settings.get(user.id) || {};
            await persistenceService.settings.save(user.id, { ...currentSettings, autoBackupEnabled: newValue });
            toast.success(newValue ? t('settings.autoBackupOn', 'Auto backup enabled') : t('settings.autoBackupOff', 'Auto backup disabled'));
        } catch (e) {
            setAutoBackup(!newValue); // revert
            toast.error(t('settings.error', 'An error occurred'));
        }
    };

    const handleDownloadLocal = async () => {
        if (!user?.id) return;
        setIsLoading(true);
        try {
            await BackupService.downloadLocalBackup(user.id);
            toast.success(t('settings.backupDownloaded', 'Backup downloaded successfully'));
        } catch (e) {
            toast.error(t('settings.backupError', 'Failed to create backup'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleUploadLocal = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user?.id) return;

        setIsLoading(true);
        try {
            const text = await file.text();
            const data = JSON.parse(text) as BackupData;
            await BackupService.importData(user.id, data);
            toast.success(t('settings.restoreSuccess', 'Data restored! Please restart the app.'));
            setTimeout(() => window.location.reload(), 2000);
        } catch (err) {
            toast.error(t('settings.restoreError', 'Invalid backup file'));
            console.error(err);
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleCloudBackup = async () => {
        if (!user?.id) return;
        setIsLoading(true);
        try {
            await BackupService.createCloudBackup(user.id);
            setLastCloudBackup(new Date().toLocaleString());
            toast.success(t('settings.cloudBackupSuccess', 'Cloud backup created'));
        } catch (e) {
            toast.error(t('settings.cloudBackupError', 'Failed to create cloud backup'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleCloudRestore = async () => {
        if (!user?.id) return;
        if (!confirm(t('settings.confirmRestore', 'This will overwrite your current data. Are you sure?'))) return;
        
        setIsLoading(true);
        try {
            await BackupService.restoreCloudBackup(user.id);
            toast.success(t('settings.restoreSuccess', 'Data restored! Please restart the app.'));
            setTimeout(() => window.location.reload(), 2000);
        } catch (e) {
            toast.error(t('settings.restoreError', 'Failed to restore from cloud'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-8 pb-4">
            <div className="space-y-1">
                <h2 className="text-lg font-semibold text-white">{t('settings.tabs.data', 'Data & Recovery')}</h2>
                <p className="text-white/40 text-sm">{t('settings.dataDesc', 'Backup, restore, and protect your Matrix progress.')}</p>
            </div>

            {/* Cloud Backup Section */}
            <div className="bg-[#111] border border-white/5 rounded-2xl p-4 space-y-4 relative overflow-hidden">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                        <Cloud size={18} className="text-blue-400" />
                    </div>
                    <div>
                        <div className="text-base font-bold text-white tracking-tight">{t('settings.cloudBackup', 'Cloud Vault')}</div>
                        <div className="text-xs text-white/40 font-medium">
                            {lastCloudBackup 
                                ? `${t('settings.lastBackup', 'Last Backup')}: ${lastCloudBackup}` 
                                : t('settings.noBackup', 'No cloud backups found')}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={handleCloudBackup}
                        disabled={isLoading}
                        className="flex items-center justify-center gap-2 py-3 rounded-xl transition-colors duration-150 text-sm font-bold active:scale-95 bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30"
                    >
                        <Save size={16} />
                        <span>{t('settings.saveToCloud', 'Save Snapshot')}</span>
                    </button>
                    <button
                        onClick={handleCloudRestore}
                        disabled={isLoading || !lastCloudBackup}
                        className="flex items-center justify-center gap-2 py-3 rounded-xl transition-colors duration-150 text-sm font-bold active:scale-95 bg-white/5 text-white/60 border border-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <RefreshCw size={16} />
                        <span>{t('settings.restoreCloud', 'Restore')}</span>
                    </button>
                </div>
            </div>

            {/* Local Backup Section */}
            <div className="bg-[#111] border border-white/5 rounded-2xl p-4 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                        <Database size={18} className="text-emerald-400" />
                    </div>
                    <div>
                        <div className="text-base font-bold text-white tracking-tight">{t('settings.localBackup', 'Local Offline Backup')}</div>
                        <div className="text-xs text-white/40 font-medium">{t('settings.localBackupDesc', 'Download your raw data as a JSON file. 100% yours.')}</div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={handleDownloadLocal}
                        disabled={isLoading}
                        className="flex items-center justify-center gap-2 py-3 rounded-xl transition-colors duration-150 text-sm font-bold active:scale-95 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
                    >
                        <Download size={16} />
                        <span>{t('settings.downloadFile', 'Download File')}</span>
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading}
                        className="flex items-center justify-center gap-2 py-3 rounded-xl transition-colors duration-150 text-sm font-bold active:scale-95 bg-white/5 text-white/60 border border-white/5 hover:bg-white/10"
                    >
                        <Upload size={16} />
                        <span>{t('settings.importFile', 'Import File')}</span>
                    </button>
                    <input 
                        type="file" 
                        accept=".json" 
                        className="hidden" 
                        ref={fileInputRef} 
                        onChange={handleUploadLocal} 
                    />
                </div>
            </div>

            {/* Auto Backup Toggle */}
            <div className="bg-[#111] border border-white/5 rounded-2xl p-4 transition-colors">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                            <CloudOff size={18} className={autoBackup ? "text-purple-400" : "text-white/40"} />
                        </div>
                        <div>
                            <div className="text-base font-bold text-white tracking-tight">{t('settings.autoBackup', 'Auto Cloud Backup')}</div>
                            <div className="text-xs text-white/40 font-medium">{t('settings.autoBackupDesc', 'Automatically snapshot your data daily.')}</div>
                        </div>
                    </div>

                    <button
                        onClick={handleToggleAutoBackup}
                        className={cn(
                            "w-12 h-6 rounded-full transition-colors duration-150 relative border",
                            autoBackup 
                                ? "bg-purple-500/30 border-purple-500/50" 
                                : "bg-white/10 border-white/10"
                        )}
                    >
                        <div
                            className={cn(
                                "absolute top-0.5 w-4 h-4 rounded-full transition-all duration-150",
                                autoBackup ? "bg-purple-400 left-[26px]" : "bg-white/60 left-1"
                            )}
                        />
                    </button>
                </div>
            </div>
            
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400/80">
                <AlertTriangle size={16} className="shrink-0" />
                <p className="text-[11px] leading-tight">
                    {t('settings.backupWarning', 'Keep your downloaded JSON files secure. They contain all your unprotected private data.')}
                </p>
            </div>
        </div>
    );
};