(() => {
  function trackName(track) {
    return (typeof track.displayName === "string" && track.displayName) || track.name?.simpleText
      || track.name?.runs?.map(({ text }) => text).join("") || track.languageCode;
  }

  function currentLanguage(player) {
    const track = player.getOption?.("captions", "track");
    return track?.translationLanguage?.languageCode || track?.languageCode;
  }

  function respond(detail) {
    document.dispatchEvent(new CustomEvent("youtrans:caption-response", { detail }));
  }

  document.addEventListener("youtrans:caption-request", ({ detail }) => {
    const player = document.querySelector("#movie_player");
    if (!detail || !player || player.classList.contains("ad-showing")) return;

    try {
      const response = player.getPlayerResponse?.();
      const id = player.getVideoData?.()?.video_id || response?.videoDetails?.videoId;
      if (id && id !== detail.videoId) {
        respond({ videoId: detail.videoId, tracks: [], waiting: true });
        return;
      }

      const captions = response?.captions?.playerCaptionsTracklistRenderer;
      const tracks = new Map();
      for (const track of captions?.captionTracks || []) {
        if (!track.languageCode) continue;
        const prior = tracks.get(track.languageCode);
        if (!prior || prior.automatic) {
          tracks.set(track.languageCode, {
            code: track.languageCode, name: trackName(track),
            url: track.baseUrl, automatic: track.kind === "asr",
          });
        }
      }
      for (const track of player.getOption?.("captions", "tracklist") || []) {
        if (track.languageCode && !tracks.has(track.languageCode)) {
          tracks.set(track.languageCode, { code: track.languageCode, name: trackName(track) });
        }
      }

      let current = currentLanguage(player);
      if (detail.primary && tracks.has(detail.primary)) {
        const cc = player.querySelector(".ytp-subtitles-button");
        if (cc && cc.getAttribute("aria-pressed") === "false" && cc.getAttribute("aria-disabled") !== "true") {
          cc.click();
        }
        if (current !== detail.primary) {
          player.setOption?.("captions", "track", { languageCode: detail.primary });
          current = currentLanguage(player);
        }
      }

      respond({ videoId: detail.videoId, tracks: [...tracks.values()], current });
    } catch {
      // The player can be replaced while a watch-page navigation is in progress.
    }
  });
})();
