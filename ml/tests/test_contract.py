import unittest
import tempfile
import zipfile
from pathlib import Path
from agrotrace.prepare import parse_label
from agrotrace.prepare import prepare
from agrotrace.predict import build_result


class ContractTests(unittest.TestCase):
    def test_zero_predictions_do_not_certify_healthy_or_invent_measurements(self):
        result = build_result([], 'test-v1', 123)
        for field in ['count', 'possibleDefects', 'meanDiameterMm', 'suggestedCategory']:
            self.assertIsNone(result[field])
        self.assertTrue(result['requiresHumanReview'])
        self.assertEqual(result['mode'], 'experimental')

    def test_polygon_preserved(self):
        cls, points = parse_label('1 0.1 0.1 0.9 0.1 0.5 0.8')
        self.assertEqual(cls, 1)
        self.assertEqual(len(points), 3)

    def test_rejects_invalid_geometry(self):
        for line in ['0 0 0 0 0 0 0', '0 nan 0 1 0 0 1', '3 0 0 1 0 0 1', '0 0.5 0.5 1 1']:
            with self.subTest(line=line), self.assertRaises(ValueError):
                parse_label(line)

    def test_zip_traversal_rejected_before_writing(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            archive = root/'bad.zip'
            with zipfile.ZipFile(archive, 'w') as z:
                z.writestr('data.yaml', "names: ['Black or Brown Spots', 'Skin Damage', 'Suffocation']")
                z.writestr('../outside.txt', 'unsafe')
            with self.assertRaisesRegex(ValueError, 'Ruta insegura'):
                prepare(archive, root/'output')
            self.assertFalse((root/'outside.txt').exists())
            self.assertFalse((root/'output').exists())

    def test_wrong_dataset_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            with zipfile.ZipFile(root/'wrong.zip', 'w') as z:
                z.writestr('data.yaml', "names: ['Overripe', 'Ripe', 'Underripe']")
            with self.assertRaisesRegex(ValueError, 'clases esperadas'):
                prepare(root/'wrong.zip', root/'output')


if __name__ == '__main__':
    unittest.main()
