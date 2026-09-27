import importlib.util
import os
import tempfile
import unittest

os.environ['NCM_INSIGHTS_CODE'] = '997118'
os.environ['NCM_INSIGHTS_DB'] = tempfile.mktemp(suffix='.sqlite3')
spec = importlib.util.spec_from_file_location('ncm_insights', os.path.join(os.path.dirname(__file__), 'ncm_insights.py'))
module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)

class InsightsTests(unittest.TestCase):
    def test_identifiers_are_bounded(self):
        self.assertEqual(module.clean_id('v_abc-123', 'v_'), 'v_abc-123')
        self.assertEqual(module.clean_id('somebody@example.com', 'v_'), '')

    def test_properties_drop_private_fields(self):
        result = module.clean_properties('conversion_success', {'format':'NCM','filename':'private.ncm','title':'Secret','sizeBucket':'<5 MB'})
        self.assertEqual(result, {'format':'NCM','sizeBucket':'<5 MB','durationBucket':'未知'})

    def test_file_counts_are_clamped(self):
        result = module.clean_properties('files_added', {'count':1000,'formats':{'NCM':200,'EXE':2}})
        self.assertEqual(result, {'count':100,'formats':{'NCM':100}})

if __name__ == '__main__': unittest.main()
