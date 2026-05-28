import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:nfc_manager/nfc_manager.dart';
import 'package:go_router/go_router.dart';
import '../../core/services/api_service.dart';
import '../../core/theme/app_theme.dart';

class ScannerScreen extends StatefulWidget {
  const ScannerScreen({super.key});

  @override
  State<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen> {
  final _manualCtrl = TextEditingController();
  bool _nfcAvailable = false;
  bool _scanning = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _checkNfc();
  }

  Future<void> _checkNfc() async {
    final available = await NfcManager.instance.isAvailable();
    if (mounted) setState(() => _nfcAvailable = available);
  }

  void _onQrDetected(BarcodeCapture capture) {
    final code = capture.barcodes.firstOrNull?.rawValue;
    if (code != null && !_scanning) {
      _scanning = true;
      _lookup(code, 'QR');
    }
  }

  void _startNfcScan() {
    NfcManager.instance.startSession(onDiscovered: (NfcTag tag) async {
      final ndef = Ndef.from(tag);
      if (ndef != null) {
        final record = ndef.cachedMessage?.records.firstOrNull;
        final payload = record?.payload;
        if (payload != null && payload.isNotEmpty) {
          final hardwareId = String.fromCharCodes(payload.skip(3));
          await NfcManager.instance.stopSession();
          _lookup(hardwareId, 'RFID');
        }
      } else {
        final identifier = tag.data.values.firstOrNull?['identifier'] as List<dynamic>?;
        if (identifier != null) {
          final hardwareId = identifier.map((b) => (b as int).toRadixString(16).padLeft(2, '0')).join(':').toUpperCase();
          await NfcManager.instance.stopSession();
          _lookup(hardwareId, 'RFID');
        }
      }
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Approchez le tag NFC du téléphone…'), duration: Duration(seconds: 5)),
    );
  }

  Future<void> _lookup(String hardwareId, String tagType) async {
    setState(() { _error = null; });
    try {
      final result = await ApiService.instance.getAssetByTagId(hardwareId);
      if (!mounted) return;
      if (result != null) {
        context.push('/assets/${result['asset']['id']}');
      } else {
        context.push('/enroll?hardwareId=$hardwareId&tagType=$tagType');
      }
    } catch (_) {
      if (mounted) {
        setState(() { _error = 'Erreur réseau. Vérifiez votre connexion.'; _scanning = false; });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Scanner terrain')),
      body: Column(children: [
        // QR camera preview
        Expanded(
          flex: 3,
          child: ClipRRect(
            borderRadius: const BorderRadius.vertical(bottom: Radius.circular(24)),
            child: MobileScanner(onDetect: _onQrDetected),
          ),
        ),

        Expanded(
          flex: 2,
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(children: [
              if (_error != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: AppTheme.danger.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.danger.withOpacity(0.3)),
                  ),
                  child: Text(_error!, style: const TextStyle(color: AppTheme.danger, fontSize: 13)),
                ),

              if (_nfcAvailable)
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.nfc),
                    label: const Text('Scanner NFC'),
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size.fromHeight(48),
                      side: const BorderSide(color: AppTheme.primary),
                      foregroundColor: AppTheme.primary,
                    ),
                    onPressed: _startNfcScan,
                  ),
                ),

              const SizedBox(height: 12),
              const Divider(),
              const Text('Saisie manuelle', style: TextStyle(color: Color(0xFF64748B), fontSize: 12)),
              const SizedBox(height: 8),
              Row(children: [
                Expanded(
                  child: TextField(
                    controller: _manualCtrl,
                    decoration: const InputDecoration(
                      hintText: 'Identifiant du tag (QR/RFID/BLE)',
                      isDense: true,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(minimumSize: const Size(56, 48)),
                  onPressed: () {
                    final v = _manualCtrl.text.trim();
                    if (v.isNotEmpty) _lookup(v, 'QR');
                  },
                  child: const Icon(Icons.search),
                ),
              ]),
            ]),
          ),
        ),
      ]),
    );
  }

  @override
  void dispose() {
    _manualCtrl.dispose();
    NfcManager.instance.stopSession().ignore();
    super.dispose();
  }
}
