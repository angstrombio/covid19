OVERRIDES = {
    "Massachusetts":
        {
            "Dukes and Nantucket": "25007",
        },
    "Michigan":
        {
            "Federal Correctional Institution (FCI)": "XXXXX",
            "Michigan Department of Corrections (MDOC)": "XXXXX"
        },
    "Missouri":
        {
            "Kansas City": "29095",
        },
    "Recovered":
        {
            "": "XXXXX"
        },
    "Utah":
        {
            "Bear River": "49003",  # TODO Better mappings
            "Southeast Utah": "49007",  # TODO Better mappings
            "Central Utah": "49039",  # TODO Better mappings
            "TriCounty": "49047",  # TODO Better mappings
            "Weber-Morgan": "49057"  # TODO Better mappings
        }
}

OVERRIDE_COUNTIES_WITH_DATA = [
    '49001', 
    '49005',  # Utah county merged into public health authority region in source data.
    '49013',  # Utah county merged into public health authority region in source data.
    '49015',  # Utah county merged into public health authority region in source data.
    '49017',  # Utah county merged into public health authority region in source data.
    '49019',  # Utah county merged into public health authority region in source data.
    '49021',  # Utah county merged into public health authority region in source data.
    '49025',  # Utah county merged into public health authority region in source data.
]
IGNORED_COUNTIES = [
    '66', '69', '72', '78',
    'XXXXX'
]
