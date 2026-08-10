/** XSDs using constructs schema-forge does not support.
 *
 * Each of these previously built a registry that looked fine and silently
 * dropped the content, so they exist to prove the parser now refuses them.
 */

const wrap = (body: string): string => `<?xml version="1.0" encoding="utf-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="urn:test" elementFormDefault="qualified">
${body}
</xs:schema>`;

export const withChoice = wrap(`
	<xs:element name="Root">
		<xs:complexType>
			<xs:choice>
				<xs:element name="A" type="xs:string"/>
				<xs:element name="B" type="xs:string"/>
			</xs:choice>
		</xs:complexType>
	</xs:element>`);

export const withAll = wrap(`
	<xs:element name="Root">
		<xs:complexType>
			<xs:all>
				<xs:element name="A" type="xs:string"/>
			</xs:all>
		</xs:complexType>
	</xs:element>`);

export const withAttribute = wrap(`
	<xs:element name="Root">
		<xs:complexType>
			<xs:sequence>
				<xs:element name="A" type="xs:string"/>
			</xs:sequence>
			<xs:attribute name="id" type="xs:string" use="required"/>
		</xs:complexType>
	</xs:element>`);

export const withComplexContent = wrap(`
	<xs:element name="Root">
		<xs:complexType>
			<xs:complexContent>
				<xs:extension base="BaseType">
					<xs:sequence>
						<xs:element name="Extra" type="xs:string"/>
					</xs:sequence>
				</xs:extension>
			</xs:complexContent>
		</xs:complexType>
	</xs:element>`);

export const withSimpleContent = wrap(`
	<xs:element name="Root">
		<xs:complexType>
			<xs:simpleContent>
				<xs:extension base="xs:string">
					<xs:attribute name="unit" type="xs:string"/>
				</xs:extension>
			</xs:simpleContent>
		</xs:complexType>
	</xs:element>`);

export const withNamedComplexType = wrap(`
	<xs:element name="Root" type="RootType"/>
	<xs:complexType name="RootType">
		<xs:sequence>
			<xs:element name="A" type="xs:string"/>
		</xs:sequence>
	</xs:complexType>`);

export const withElementRef = wrap(`
	<xs:element name="Root">
		<xs:complexType>
			<xs:sequence>
				<xs:element ref="Shared"/>
			</xs:sequence>
		</xs:complexType>
	</xs:element>`);

export const withInclude = wrap(`
	<xs:include schemaLocation="other.xsd"/>
	<xs:element name="Root">
		<xs:complexType>
			<xs:sequence>
				<xs:element name="A" type="xs:string"/>
			</xs:sequence>
		</xs:complexType>
	</xs:element>`);

export const withImport = wrap(`
	<xs:import namespace="urn:other" schemaLocation="other.xsd"/>
	<xs:element name="Root">
		<xs:complexType>
			<xs:sequence>
				<xs:element name="A" type="xs:string"/>
			</xs:sequence>
		</xs:complexType>
	</xs:element>`);

/** A supported schema, to prove the guards do not fire on valid input. */
export const supported = wrap(`
	<xs:element name="Root">
		<xs:complexType>
			<xs:sequence>
				<xs:element name="A" type="xs:string"/>
			</xs:sequence>
		</xs:complexType>
	</xs:element>`);
