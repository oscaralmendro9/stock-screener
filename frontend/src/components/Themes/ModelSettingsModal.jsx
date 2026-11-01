import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleAlert, CircleCheck, Cloud, Monitor, RefreshCw } from 'lucide-react';
import { Button } from '@/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/ui/dialog';
import { Notice } from '@/ui/notice';
import { Field, Pill, Select, Spinner } from '../../features/themes/themeUi';
import {
  getLLMConfig,
  updateLLMModel,
  updateOllamaSettings,
  getOllamaModels,
} from '../../api/themes';

const STATUS_LABELS = {
  connected: 'Connected',
  disconnected: 'Disconnected',
  timeout: 'Timeout',
  error: 'Error',
  not_configured: 'Not Configured',
};

function ModelSettingsModal({ open, onClose }) {
  const queryClient = useQueryClient();
  const [selectedExtractionModel, setSelectedExtractionModel] = useState('');
  const [ollamaApiBase, setOllamaApiBase] = useState('');
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Fetch current config
  const { data: config, isLoading, refetch: refetchConfig } = useQuery({
    queryKey: ['llmConfig'],
    queryFn: getLLMConfig,
    enabled: open,
  });

  // Fetch Ollama models (only when connected)
  const { data: ollamaModelsData, refetch: refetchOllamaModels } = useQuery({
    queryKey: ['ollamaModels'],
    queryFn: getOllamaModels,
    enabled: open && config?.ollama_status === 'connected',
  });

  // Update local state when config loads
  useEffect(() => {
    if (config) {
      setSelectedExtractionModel(config.extraction?.current_model || '');
      setOllamaApiBase(config.ollama_api_base || 'http://localhost:11434');
    }
  }, [config]);

  // Mutation for updating model
  const updateModelMutation = useMutation({
    mutationFn: ({ modelId, useCase }) => updateLLMModel(modelId, useCase),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['llmConfig'] });
      setSuccessMessage('Model updated successfully');
      setError(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err) => {
      setError(err.response?.data?.detail || 'Failed to update model');
      setSuccessMessage(null);
    },
  });

  // Mutation for updating Ollama settings
  const updateOllamaMutation = useMutation({
    mutationFn: (apiBase) => updateOllamaSettings(apiBase),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['llmConfig'] });
      queryClient.invalidateQueries({ queryKey: ['ollamaModels'] });
      if (data.ollama_status === 'connected') {
        setSuccessMessage('Ollama connected successfully');
      } else {
        setError(`Ollama status: ${data.ollama_status}`);
      }
    },
    onError: (err) => {
      setError(err.response?.data?.detail || 'Failed to update Ollama settings');
    },
  });

  const handleModelChange = (modelId) => {
    setSelectedExtractionModel(modelId);
    updateModelMutation.mutate({ modelId, useCase: 'extraction' });
  };

  const handleOllamaUpdate = () => {
    updateOllamaMutation.mutate(ollamaApiBase);
  };

  const handleRefresh = () => {
    refetchConfig();
    if (config?.ollama_status === 'connected') {
      refetchOllamaModels();
    }
  };

  // Group models by provider/category
  const cloudModels = config?.available_models?.filter(m => m.category === 'cloud') || [];
  const localModels = config?.available_models?.filter(m => m.category === 'local') || [];
  const hasLocalModels = localModels.length > 0;

  // Get current model info
  const currentModelInfo = config?.extraction?.model_info;
  const isLocalModel = currentModelInfo?.category === 'local';

  const statusTone = { connected: 'gain', disconnected: 'loss', timeout: 'warning', error: 'loss' }[config?.ollama_status] || 'muted';

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent
        title="LLM Settings"
        size="sm"
        footer={(
          <>
            <Button variant="ghost" size="sm" onClick={handleRefresh}>
              <RefreshCw aria-hidden="true" />
              Refresh status
            </Button>
            <DialogClose asChild><Button variant="ghost" size="sm">Close</Button></DialogClose>
          </>
        )}
      >
        {error && (
          <Notice tone="error" className="mb-4" onDismiss={() => setError(null)}>
            {error}
          </Notice>
        )}

        {successMessage && (
          <Notice className="mb-4" onDismiss={() => setSuccessMessage(null)}>
            {successMessage}
          </Notice>
        )}

        {isLoading ? (
          <div className="flex justify-center p-8"><Spinner label="Loading LLM settings" /></div>
        ) : (
          <>
            {/* Current Model Status */}
            <section className="mb-6 rounded-md border border-border p-4">
              <h3 className="mb-1 text-sm text-muted-foreground">Current Extraction Model</h3>
              <div className="flex items-center gap-2">
                {isLocalModel ? <Monitor aria-hidden="true" className="size-5" /> : <Cloud aria-hidden="true" className="size-5" />}
                <span className="text-lg font-semibold">{currentModelInfo?.name || selectedExtractionModel}</span>
                <Pill tone="muted">{isLocalModel ? 'Local' : 'Cloud'}</Pill>
              </div>
              <p className="text-[11px] text-muted-foreground">Provider: {currentModelInfo?.provider || 'unknown'}</p>
            </section>

            {/* Model Selection */}
            <Select
              label="Extraction Model"
              value={selectedExtractionModel}
              onChange={handleModelChange}
              disabled={updateModelMutation.isPending}
              className="mb-6"
            >
              <optgroup label="Cloud models">
                {cloudModels.map((model) => (
                  <option key={model.id} value={model.id}>{`${model.name} · ${model.provider}`}</option>
                ))}
              </optgroup>
              {hasLocalModels && (
                <optgroup label="Local models (Ollama)">
                  {localModels.map((model) => (
                    <option key={model.id} value={model.id}>{model.name}</option>
                  ))}
                </optgroup>
              )}
            </Select>

            {hasLocalModels && (
              <>
                <hr className="my-6 border-border" />

                {/* Ollama Configuration */}
                <h3 className="mb-2 flex items-center gap-2 font-semibold">
                  <Monitor aria-hidden="true" className="size-5" />
                  Ollama Configuration
                </h3>

                <div className="mb-4 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Pill tone={statusTone}>
                    {config?.ollama_status === 'connected' ? <CircleCheck aria-hidden="true" className="size-3.5" /> : <CircleAlert aria-hidden="true" className="size-3.5" />}
                    {STATUS_LABELS[config?.ollama_status] || 'Unknown'}
                  </Pill>
                </div>

                <div className="mb-4 flex items-start gap-2">
                  <Field
                    className="flex-1"
                    label="Ollama API URL"
                    value={ollamaApiBase}
                    onChange={(e) => setOllamaApiBase(e.target.value)}
                    placeholder="http://localhost:11434"
                    helperText="Default: http://localhost:11434"
                  />
                  <Button variant="secondary" size="sm" className="mt-4" onClick={handleOllamaUpdate} disabled={updateOllamaMutation.isPending}>
                    {updateOllamaMutation.isPending ? <Spinner label="Testing" className="size-4" /> : 'Test'}
                  </Button>
                </div>

                {/* Installed Ollama Models */}
                {config?.ollama_status === 'connected' && ollamaModelsData?.models?.length > 0 && (
                  <div>
                    <p className="mb-1 text-sm text-muted-foreground">Installed Models ({ollamaModelsData.models.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {ollamaModelsData.models.map((model) => (
                        <button
                          key={model.id}
                          type="button"
                          onClick={() => handleModelChange(model.id)}
                          className="inline-flex h-6 cursor-pointer items-center rounded-full border border-border px-2 text-[11px] outline-none hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {model.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {config?.ollama_status === 'disconnected' && (
                  <Notice className="mt-4">
                    <p className="text-sm">To use local models, install and run Ollama:</p>
                    <p className="mt-2 font-mono text-[11px]">
                      1. Install: curl -fsSL https://ollama.com/install.sh | sh<br />
                      2. Pull a model: ollama pull llama3.1:8b<br />
                      3. Start server: ollama serve
                    </p>
                  </Notice>
                )}
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ModelSettingsModal;
