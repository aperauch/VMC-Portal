from wavefront_sdk.client_factory import WavefrontClientFactory

# Create a sender with:
   # Required Parameter
   #   URL format to send data via proxy: "proxy://<your.proxy.load.balancer.com>:<somePort>"
   #   URL format to send data via direct ingestion: "https://TOKEN@DOMAIN.wavefront.com"
   # Optional Parameter
   #   max queue size (in data points). Default: 50000
   #   batch size (in data points). Default: 10000
   #   flush interval  (in seconds). Default: 1 second

client_factory = WavefrontClientFactory()
client_factory.add_client(
    url="proxy://localhost:2878",
    max_queue_size=50000,
    batch_size=10000,
    flush_interval_seconds=5)
wavefront_sender = client_factory.get_client()

from uuid import UUID

# Wavefront metrics data format:
# <metricName> <metricValue> [<timestamp>] source=<source> [pointTags]
wavefront_sender.send_metric(
    name="new york.power.usage", value=42422.0, timestamp=1533529977,
    source="euc-lp-1-sender-metric", tags={"server": "euc-lp-1"})

# Wavefront delta counter data format:
# <metricName> <metricValue> source=<source> [pointTags]
wavefront_sender.send_delta_counter(
    name="delta.counter", value=1.0,
    source="euc-lp-1-sender-delta-counter", tags={"server": "euc-lp-1"})



from wavefront_sdk.entities.histogram import histogram_granularity

# Wavefront histogram data format:
# {!M | !H | !D} [<timestamp>] #<count> <mean> [centroids] <histogramName> source=<source> [pointTags]
# Example: You can choose to send to at most 3 bins: Minute, Hour, Day
# "!M 1533529977 #20 30.0 #10 5.1 request.latency source=appServer1 region=us-west"
# "!H 1533529977 #20 30.0 #10 5.1 request.latency source=appServer1 region=us-west"
# "!D 1533529977 #20 30.0 #10 5.1 request.latency source=appServer1 region=us-west"
wavefront_sender.send_distribution(
    name="request.latency", centroids=[(30, 20), (5.1, 10)],
    histogram_granularities={histogram_granularity.DAY,
                             histogram_granularity.HOUR,
                             histogram_granularity.MINUTE},
    timestamp=1533529977, source="euc-lp-1-sender-histo", tags={"region": "us-west"})


# Wavefront event format:
# @Event <StartTime> <EndTime> "<EventName>"  severity="<Severity>"
# type="<Type>" details="<EventDetail>" host="<Source>" tag="<Tags>"
wavefront_sender.send_event('test_send_event', 1592200048, 1592201048, "euc-lp-1-send-event",
    ["env:", "dev"], {"severity": "info", "type": "backup", "details": "broker backup"})


import wavefront_opentracing_sdk.reporting
from wavefront_opentracing_sdk.reporting import CompositeReporter
from wavefront_opentracing_sdk.reporting import ConsoleReporter
from wavefront_opentracing_sdk.reporting import WavefrontSpanReporter
from wavefront_sdk.common import ApplicationTags
from wavefront_sdk import WavefrontDirectClient
wf_span_reporter = wavefront_opentracing_sdk.reporting.WavefrontSpanReporter(
    client=wavefront_sender,
    source='euc-lp-1-span-reporter'   # optional nondefault source name
)

# Create a console reporter that reports span to stdout
console_reporter = ConsoleReporter(source='wavefront-tracing-example')
# Instantiate a composite reporter composed of console and WavefrontSpanReporter.
composite_reporter = CompositeReporter(wf_span_reporter, console_reporter)
application_tags = ApplicationTags(application="euc-lab-portal-api",
                                   service="api",
                                   custom_tags=[("environment", "production")])
# Add all environment variables with names starting with MY_ as custom tags.
application_tags.add_custom_tags_from_env("^MY_.*$")
# Add the environment variable POD_NAME as the custom tag with the tag name pod_name.
#application_tags.add_custom_tag_from_env("pod_name", "POD_NAME")

# Construct Wavefront opentracing Tracer
tracer = wavefront_opentracing_sdk.WavefrontTracer(
    reporter=wf_span_reporter,
    application_tags=application_tags)

# To get failures observed while reporting.
total_wf_span_failures = wf_span_reporter.get_failure_count()
print(total_wf_span_failures)


total_failures = wavefront_sender.get_failure_count()
print(total_failures)

# Close the sender connection
wavefront_sender.close()