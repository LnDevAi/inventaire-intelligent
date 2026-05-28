// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'pending_scan_model.dart';

// **************************************************************************
// IsarCollectionGenerator
// **************************************************************************

// coverage:ignore-file
// ignore_for_file: duplicate_ignore, non_constant_identifier_names, constant_identifier_names, invalid_use_of_protected_member, unnecessary_cast, prefer_const_constructors, lines_longer_than_80_chars, require_trailing_commas, inference_failure_on_function_invocation, unnecessary_parenthesis, unnecessary_raw_strings, unnecessary_null_checks, join_return_with_assignment, prefer_final_locals, avoid_js_rounded_ints, avoid_positional_boolean_parameters, always_specify_types

extension GetPendingScanModelCollection on Isar {
  IsarCollection<PendingScanModel> get pendingScanModels => this.collection();
}

const PendingScanModelSchema = CollectionSchema(
  name: r'PendingScanModel',
  id: -3359317664974668899,
  properties: {
    r'assetName': PropertySchema(id: 0, name: r'assetName', type: IsarType.string),
    r'category': PropertySchema(id: 1, name: r'category', type: IsarType.string),
    r'createdAt': PropertySchema(id: 2, name: r'createdAt', type: IsarType.dateTime),
    r'depreciationYears': PropertySchema(id: 3, name: r'depreciationYears', type: IsarType.long),
    r'hardwareId': PropertySchema(id: 4, name: r'hardwareId', type: IsarType.string),
    r'latitude': PropertySchema(id: 5, name: r'latitude', type: IsarType.double),
    r'longitude': PropertySchema(id: 6, name: r'longitude', type: IsarType.double),
    r'photoPath': PropertySchema(id: 7, name: r'photoPath', type: IsarType.string),
    r'purchaseDate': PropertySchema(id: 8, name: r'purchaseDate', type: IsarType.string),
    r'purchasePrice': PropertySchema(id: 9, name: r'purchasePrice', type: IsarType.double),
    r'synced': PropertySchema(id: 10, name: r'synced', type: IsarType.bool),
    r'tagType': PropertySchema(id: 11, name: r'tagType', type: IsarType.string),
  },
  estimateSize: _pendingScanModelEstimateSize,
  serialize: _pendingScanModelSerialize,
  deserialize: _pendingScanModelDeserialize,
  deserializeProp: _pendingScanModelDeserializeProp,
  idName: r'id',
  indexes: {
    r'createdAt': IndexSchema(
      id: 1362207895435776698,
      name: r'createdAt',
      unique: false,
      replace: false,
      properties: [IndexPropertySchema(name: r'createdAt', type: IndexType.value, caseSensitive: false)],
    ),
    r'synced': IndexSchema(
      id: -4800419712890530603,
      name: r'synced',
      unique: false,
      replace: false,
      properties: [IndexPropertySchema(name: r'synced', type: IndexType.value, caseSensitive: false)],
    ),
  },
  links: {},
  embeddedSchemas: {},
  getId: _pendingScanModelGetId,
  getLinks: _pendingScanModelGetLinks,
  attach: _pendingScanModelAttach,
  version: '3.1.0+1',
);

int _pendingScanModelEstimateSize(PendingScanModel object, List<int> offsets, Map<Type, List<int>> allOffsets) {
  var bytesCount = offsets.last;
  bytesCount += 3 + object.assetName.length * 3;
  bytesCount += 3 + object.category.length * 3;
  bytesCount += 3 + object.hardwareId.length * 3;
  {final value = object.photoPath; if (value != null) { bytesCount += 3 + value.length * 3; }}
  bytesCount += 3 + object.purchaseDate.length * 3;
  bytesCount += 3 + object.tagType.length * 3;
  return bytesCount;
}

void _pendingScanModelSerialize(PendingScanModel object, IsarWriter writer, List<int> offsets, Map<Type, List<int>> allOffsets) {
  writer.writeString(offsets[0], object.assetName);
  writer.writeString(offsets[1], object.category);
  writer.writeDateTime(offsets[2], object.createdAt);
  writer.writeLong(offsets[3], object.depreciationYears);
  writer.writeString(offsets[4], object.hardwareId);
  writer.writeDouble(offsets[5], object.latitude);
  writer.writeDouble(offsets[6], object.longitude);
  writer.writeString(offsets[7], object.photoPath);
  writer.writeString(offsets[8], object.purchaseDate);
  writer.writeDouble(offsets[9], object.purchasePrice);
  writer.writeBool(offsets[10], object.synced);
  writer.writeString(offsets[11], object.tagType);
}

PendingScanModel _pendingScanModelDeserialize(Id id, IsarReader reader, List<int> offsets, Map<Type, List<int>> allOffsets) {
  final object = PendingScanModel();
  object.assetName = reader.readString(offsets[0]);
  object.category = reader.readString(offsets[1]);
  object.createdAt = reader.readDateTime(offsets[2]);
  object.depreciationYears = reader.readLong(offsets[3]);
  object.hardwareId = reader.readString(offsets[4]);
  object.latitude = reader.readDoubleOrNull(offsets[5]);
  object.longitude = reader.readDoubleOrNull(offsets[6]);
  object.photoPath = reader.readStringOrNull(offsets[7]);
  object.purchaseDate = reader.readString(offsets[8]);
  object.purchasePrice = reader.readDouble(offsets[9]);
  object.synced = reader.readBool(offsets[10]);
  object.tagType = reader.readString(offsets[11]);
  object.id = id;
  return object;
}

dynamic _pendingScanModelDeserializeProp(IsarReader reader, int propertyId, int offset, Map<Type, List<int>> allOffsets) {
  switch (propertyId) {
    case 0: return reader.readString(offset);
    case 1: return reader.readString(offset);
    case 2: return reader.readDateTime(offset);
    case 3: return reader.readLong(offset);
    case 4: return reader.readString(offset);
    case 5: return reader.readDoubleOrNull(offset);
    case 6: return reader.readDoubleOrNull(offset);
    case 7: return reader.readStringOrNull(offset);
    case 8: return reader.readString(offset);
    case 9: return reader.readDouble(offset);
    case 10: return reader.readBool(offset);
    case 11: return reader.readString(offset);
    default: throw IsarError('Unknown property with id $propertyId');
  }
}

Id _pendingScanModelGetId(PendingScanModel object) => object.id;
List<IsarLinkBase<dynamic>> _pendingScanModelGetLinks(PendingScanModel object) => [];
void _pendingScanModelAttach(IsarCollection<dynamic> col, Id id, PendingScanModel object) { object.id = id; }

extension PendingScanModelQueryWhereSort on QueryBuilder<PendingScanModel, PendingScanModel, QWhere> {
  QueryBuilder<PendingScanModel, PendingScanModel, QAfterWhere> anyId() {
    return QueryBuilder.apply(this, (query) => query.addWhereClause(const IdWhereClause.any()));
  }
}

extension PendingScanModelQueryWhere on QueryBuilder<PendingScanModel, PendingScanModel, QWhereClause> {
  QueryBuilder<PendingScanModel, PendingScanModel, QAfterWhereClause> idEqualTo(Id id) {
    return QueryBuilder.apply(this, (query) => query.addWhereClause(IdWhereClause.between(lower: id, upper: id)));
  }
}

extension PendingScanModelQueryFilter on QueryBuilder<PendingScanModel, PendingScanModel, QFilterCondition> {
  QueryBuilder<PendingScanModel, PendingScanModel, QAfterFilterCondition> syncedEqualTo(bool value) {
    return QueryBuilder.apply(this, (query) => query.addFilterCondition(FilterCondition.equalTo(property: r'synced', value: value)));
  }
  QueryBuilder<PendingScanModel, PendingScanModel, QAfterFilterCondition> hardwareIdEqualTo(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) => query.addFilterCondition(FilterCondition.equalTo(property: r'hardwareId', value: value, caseSensitive: caseSensitive)));
  }
}

extension PendingScanModelQuerySortBy on QueryBuilder<PendingScanModel, PendingScanModel, QSortBy> {
  QueryBuilder<PendingScanModel, PendingScanModel, QAfterSortBy> sortByCreatedAtDesc() {
    return QueryBuilder.apply(this, (query) => query.addSortBy(r'createdAt', Sort.desc));
  }
}
