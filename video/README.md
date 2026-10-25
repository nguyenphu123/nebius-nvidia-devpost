# Optional video authoring tools

These scripts are not required to install or run the Second Serving app.

- `prepare_review.py` extracts timestamped frames from a recording supplied by the user.
- `render_captioned.py` uses `caption-plan-2026-10-24.json` to edit the specific reviewed recording and add English captions. Other recordings need their own reviewed edit plan.
- The root `render-demo.py` and `render-rescue-recording.py` are historical authoring helpers, not the current product workflow. The latter needs local inputs in the ignored `rescue-recording/` folder.

Python tools require Pillow and imageio-ffmpeg, separately from the Node dependencies. The current scripts use Windows Segoe UI font paths. `.demo-tools/` was the author's local Python dependency directory; it is intentionally not published. Install the Python packages in your own environment if using these optional tools.

Raw recordings, webcam/browser captures, extracted review frames and Python bytecode stay local and are ignored by Git. Video source files are not included in a fresh clone. The app's frontend assets in `public/`, the historical renderer's `demo-assets/`, and the curated captioned-video poster/sidecars are retained.

See [the recording guide](../RECORDING-GUIDE.md) for the current signed-in app workflow. Publishing source does not publish the MP4; the final submission video must be hosted separately.
