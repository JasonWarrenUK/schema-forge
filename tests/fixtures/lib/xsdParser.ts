// Minimal valid XSD with single simple element
export const minimalXsd = `<?xml version="1.0" encoding="utf-8"?>
<xs:schema targetNamespace="http://test.example.com/2025"
            xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="TestElement" type="xs:string" />
</xs:schema>`;

// XSD with element that has minOccurs/maxOccurs
export const elementWithCardinality = `<?xml version="1.0" encoding="utf-8"?>
<xs:schema targetNamespace="http://test.example.com/2025"
            xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="TestContainer">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="OptionalElement" type="xs:string" minOccurs="0" maxOccurs="1" />
        <xs:element name="RequiredElement" type="xs:int" minOccurs="1" maxOccurs="1" />
        <xs:element name="RepeatingElement" type="xs:string" minOccurs="0" maxOccurs="unbounded" />
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>`;

// XSD with inline simpleType restriction
export const inlineSimpleType = `<?xml version="1.0" encoding="utf-8"?>
<xs:schema targetNamespace="http://test.example.com/2025"
            xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="RestrictedString">
    <xs:simpleType>
      <xs:restriction base="xs:string">
        <xs:pattern value="[A-Z]{2}[0-9]{4}" />
        <xs:minLength value="6" />
        <xs:maxLength value="6" />
      </xs:restriction>
    </xs:simpleType>
  </xs:element>
</xs:schema>`;

// XSD with named simpleType (referenced by element)
export const namedSimpleType = `<?xml version="1.0" encoding="utf-8"?>
<xs:schema targetNamespace="http://test.example.com/2025"
            xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:simpleType name="PostcodeType">
    <xs:restriction base="xs:string">
      <xs:pattern value="[A-Z]{1,2}[0-9]{1,2}[A-Z]? [0-9][A-Z]{2}" />
    </xs:restriction>
  </xs:simpleType>
  <xs:element name="Postcode" type="PostcodeType" />
</xs:schema>`;

// XSD with complexType containing sequence
export const complexTypeWithSequence = `<?xml version="1.0" encoding="utf-8"?>
<xs:schema targetNamespace="http://test.example.com/2025"
            xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="Person">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="FirstName" type="xs:string" />
        <xs:element name="LastName" type="xs:string" />
        <xs:element name="Age" type="xs:int" minOccurs="0" />
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>`;

// XSD with enumeration restriction
export const enumerationType = `<?xml version="1.0" encoding="utf-8"?>
<xs:schema targetNamespace="http://test.example.com/2025"
            xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="Status">
    <xs:simpleType>
      <xs:restriction base="xs:string">
        <xs:enumeration value="Active" />
        <xs:enumeration value="Inactive" />
        <xs:enumeration value="Pending" />
      </xs:restriction>
    </xs:simpleType>
  </xs:element>
</xs:schema>`;

// Expected namespace for test fixtures
export const expectedNamespace = 'http://test.example.com/2025';

// XSD with deep nesting (simulates ILR structure: Message/Header/CollectionDetails)
export const deeplyNestedStructure = `<?xml version="1.0" encoding="utf-8"?>
<xs:schema targetNamespace="http://test.example.com/2025"
            xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="Message">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="Header">
          <xs:complexType>
            <xs:sequence>
              <xs:element name="CollectionDetails">
                <xs:complexType>
                  <xs:sequence>
                    <xs:element name="Collection" type="xs:string" />
                    <xs:element name="Year" type="xs:string" />
                  </xs:sequence>
                </xs:complexType>
              </xs:element>
              <xs:element name="Source">
                <xs:complexType>
                  <xs:sequence>
                    <xs:element name="UKPRN">
                      <xs:simpleType>
                        <xs:restriction base="xs:int">
                          <xs:minInclusive value="10000000" />
                          <xs:maxInclusive value="99999999" />
                        </xs:restriction>
                      </xs:simpleType>
                    </xs:element>
                  </xs:sequence>
                </xs:complexType>
              </xs:element>
            </xs:sequence>
          </xs:complexType>
        </xs:element>
        <xs:element name="Learner" minOccurs="1" maxOccurs="unbounded">
          <xs:complexType>
            <xs:sequence>
              <xs:element name="ULN" type="xs:string" />
            </xs:sequence>
          </xs:complexType>
        </xs:element>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>`;
