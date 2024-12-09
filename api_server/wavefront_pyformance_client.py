from wavefront_pyformance import tagged_registry
from wavefront_pyformance import wavefront_reporter

reg = tagged_registry.TaggedRegistry()
c1 = reg.counter("numbers")
c1.inc()

host = "localhost"

# report metrics to a Wavefront proxy every 10s
wf_proxy_reporter = wavefront_reporter.WavefrontProxyReporter(
    host=host, port=2878, registry=reg,
    source='euc-lp-1',
    tags={'key1': 'val1', 'key2': 'val2'},
    prefix='python.proxy.',
    reporting_interval=10,
    enable_runtime_metrics=True)
wf_proxy_reporter.report_now()