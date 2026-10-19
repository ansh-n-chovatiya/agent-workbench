// Render is injected so concurrency, progress and cancellation can be tested without sockets or a browser.
export function createExportJob({ render, onEvent = () => {}, onComplete = async () => {} }) {
  let active;
  return {
    get running() { return !!active; },
    start(options) {
      if (active) return false;
      const job = { controller:new AbortController() }; active = job;
      onEvent('started',{});
      job.promise = Promise.resolve().then(() => render({...options,signal:job.controller.signal,
        log:message => onEvent('log',{message}),onProgress:progress => onEvent('progress',progress)}))
        .then(async result => {
          if (job.controller.signal.aborted) { onEvent('cancelled',{}); return; }
          await onComplete(result); onEvent('complete',{finalFile:result.finalFile,renderDir:result.renderDir,
            // Measured loudness comes back from the render page; it is absent when the video has no audio.
            audio:result.audio ? {integratedLufs:result.audio.measured?.integratedLufs ?? null,truePeakDb:result.audio.measured?.truePeakDb ?? null,
              codec:result.audio.codec ?? null,warnings:result.audio.warnings ?? []} : null});
        })
        .catch(error => onEvent(job.controller.signal.aborted ? 'cancelled' : 'error',{message:error.message}))
        .finally(() => { if (active === job) active = null; });
      return true;
    },
    cancel() { active?.controller.abort(); },
    async close() { active?.controller.abort(); await active?.promise; },
  };
}
