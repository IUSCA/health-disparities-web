class RetryableException(Exception):
    pass


class ValidationFailed(Exception):
    pass


class InspectionFailed(Exception):
    pass


class IngestionFailed(Exception):
    pass
